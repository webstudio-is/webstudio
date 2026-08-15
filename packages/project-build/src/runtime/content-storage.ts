import {
  blockComponent,
  blockTemplateComponent,
  decodeDataVariableId,
  getStyleDeclKey,
  getContentBlockSource,
  prop as propSchema,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type Prop,
  type Resource,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import { getExpressionIdentifiers } from "@webstudio-is/expression";
import type { BuilderState } from "../state/builder-state";
import { applyBuilderPatchTransactions } from "../state/patch";
import equal from "fast-deep-equal";
import type { BuilderPatchChange } from "../contracts/patch";
import {
  hasContentStorageChange,
  getRuntimeMutationPersistenceOrder,
  type BuilderRuntimeMutation,
  type ContentStorageChange,
  type ContentStoragePatchChange,
} from "./mutation";
import {
  getContentModeCapabilities,
  validateContentModeTransaction,
} from "./content-mode-permissions";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { throwBuilderRuntimeError } from "./errors";
import { listPropExpressions } from "./props";

export type MaterializedContentRoot = Readonly<{
  identity: ContentBlockExternalContentIdentity;
  fragment: WebstudioFragment;
}>;

export type ContentStorageRoot =
  | Readonly<{ type: "project" }>
  | Readonly<{
      type: "external";
      identity: ContentBlockExternalContentIdentity;
    }>;

export const getContentStorageIdentityKey = (
  identity: ContentBlockExternalContentIdentity
) =>
  JSON.stringify([
    identity.blockInstanceId,
    identity.assetId,
    identity.revision,
    identity.contentRef,
    identity.format,
    identity.renderScope,
  ]);

export const getContentStorageRootKey = (root: ContentStorageRoot) =>
  root.type === "project"
    ? "project"
    : `external:${getContentStorageIdentityKey(root.identity)}`;

export type ContentStorageTarget =
  | Readonly<{ type: "instance"; instanceId: Instance["id"] }>
  | Readonly<{
      type: "children";
      parentInstanceId: Instance["id"];
    }>;

export type ContentStorageOwnershipTransfer = Readonly<{
  rootInstanceId: Instance["id"];
  source: ContentStorageTarget;
  target: ContentStorageTarget;
}>;

type ContentStorageTargetResolver =
  | ContentStorageTarget
  | ((state: BuilderState) => ContentStorageTarget);

export type ContentStorageProjection = Readonly<{
  state: BuilderState;
  externalRootByBlockId: ReadonlyMap<
    Instance["id"],
    ContentBlockExternalContentIdentity
  >;
  externalRootByInstanceId: ReadonlyMap<
    Instance["id"],
    ContentBlockExternalContentIdentity
  >;
  externalRootByDataSourceId: ReadonlyMap<
    string,
    ContentBlockExternalContentIdentity
  >;
  externalRootByResourceId: ReadonlyMap<
    string,
    ContentBlockExternalContentIdentity
  >;
  externalRootByStyleSourceId: ReadonlyMap<
    string,
    ContentBlockExternalContentIdentity
  >;
  externalRootByStyleDeclKey: ReadonlyMap<
    string,
    ContentBlockExternalContentIdentity
  >;
}>;

export type ContentStorageSelectorProjection = Readonly<{
  state: BuilderState;
  getInstanceChildren: (
    instance: Instance,
    renderScope: string
  ) => Instance["children"];
}>;

export const getContentStorageProtectedChildCount = ({
  state,
  root,
  parentInstanceId,
}: {
  state: BuilderState;
  root: ContentStorageRoot;
  parentInstanceId: Instance["id"];
}) => {
  if (
    root.type !== "external" ||
    root.identity.blockInstanceId !== parentInstanceId
  ) {
    return 0;
  }
  return (
    state.instances
      ?.get(parentInstanceId)
      ?.children.filter(
        (child) =>
          child.type === "id" &&
          state.instances?.get(child.value)?.component ===
            blockTemplateComponent
      ).length ?? 0
  );
};

export const projectContentStorageChanges = ({
  state,
  changes,
}: {
  state: BuilderState;
  changes: readonly ContentStorageChange[];
}): BuilderPatchChange[] =>
  changes.flatMap(({ root, payload }) =>
    payload.map((change) => {
      if (change.namespace !== "fragment") {
        return change;
      }
      if (root.type !== "external") {
        throw new Error("Fragment changes require external storage");
      }
      const block = state.instances?.get(root.identity.blockInstanceId);
      if (block === undefined) {
        throw new Error(
          `Materialized content block "${root.identity.blockInstanceId}" is missing`
        );
      }
      const templateChildren = block.children.filter(
        (child) =>
          child.type === "id" &&
          state.instances?.get(child.value)?.component ===
            blockTemplateComponent
      );
      return {
        namespace: "instances" as const,
        patches: change.patches.map<BuilderPatchChange["patches"][number]>(
          (patch) => {
            const [field, childIndex] = patch.path;
            if (
              field === "children" &&
              patch.path.length === 2 &&
              typeof childIndex === "number"
            ) {
              return {
                ...patch,
                path: [
                  block.id,
                  "children",
                  templateChildren.length + childIndex,
                ],
              };
            }
            if (
              field === "children" &&
              patch.path.length === 1 &&
              patch.op !== "remove" &&
              Array.isArray(patch.value)
            ) {
              return {
                ...patch,
                path: [block.id, "children"],
                value: [...templateChildren, ...patch.value],
              };
            }
            throw new Error("Unsupported fragment storage patch");
          }
        ),
      };
    })
  );

const projectItemsById = <Item extends { id: string }>({
  current,
  items,
  namespace,
  rejectCollision = false,
}: {
  current: Map<string, Item> | undefined;
  items: readonly Item[];
  namespace: string;
  rejectCollision?: boolean | ((item: Item) => boolean);
}) => {
  if (items.length === 0) {
    return current;
  }
  const projected = new Map(current);
  for (const item of items) {
    const existing = projected.get(item.id);
    const collisionIsInvalid =
      rejectCollision === true ||
      (typeof rejectCollision === "function" && rejectCollision(item));
    if (collisionIsInvalid && existing !== undefined) {
      throw new Error(
        `Materialized content ${namespace} id "${item.id}" is not scope-local`
      );
    }
    if (existing !== undefined && equal(existing, item) === false) {
      throw new Error(
        `Materialized content ${namespace} id "${item.id}" conflicts with project data`
      );
    }
    if (existing === undefined) {
      projected.set(item.id, item);
    }
  }
  return projected;
};

const assertExternalBlockStorage = ({
  state,
  identity,
  validateSource,
}: {
  state: BuilderState;
  identity: ContentBlockExternalContentIdentity;
  validateSource: boolean;
}) => {
  const block = state.instances?.get(identity.blockInstanceId);
  if (block?.component !== blockComponent) {
    throw new Error(
      `Materialized content block "${identity.blockInstanceId}" is missing`
    );
  }
  if (validateSource && state.props !== undefined) {
    const source = getContentBlockSource({
      blockInstanceId: block.id,
      props: state.props.values(),
    });
    if (source === undefined) {
      throw new Error(
        `Materialized content block "${block.id}" has no valid source`
      );
    }
    if (source.type === "asset" && source.assetId !== identity.assetId) {
      throw new Error(
        `Materialized content block "${block.id}" has changed source`
      );
    }
  }
  const templateChildren = block.children.filter(
    (child) =>
      child.type === "id" &&
      state.instances?.get(child.value)?.component === blockTemplateComponent
  );
  if (templateChildren.length !== 1) {
    throw new Error(
      `Source-backed Content Block "${block.id}" must contain one Templates list`
    );
  }
  const hasPersistedContent = block.children.some(
    (child) =>
      child.type !== "id" ||
      state.instances?.get(child.value)?.component !== blockTemplateComponent
  );
  if (hasPersistedContent) {
    throw new Error(
      `Source-backed Content Block "${block.id}" contains persisted content`
    );
  }
  return block;
};

const assertFragmentInstanceReferences = (fragment: WebstudioFragment) => {
  const instanceIds = new Set(
    fragment.instances.map((instance) => instance.id)
  );
  const children = [
    ...fragment.children,
    ...fragment.instances.flatMap((instance) => instance.children),
  ];
  for (const child of children) {
    if (child.type === "id" && instanceIds.has(child.value) === false) {
      throw new Error(
        `Materialized instance "${child.value}" is outside its storage root`
      );
    }
  }
};

const createContentStorageProjectionInternal = ({
  state,
  materializedRoots,
  includeRootChildren,
  validateSource,
}: {
  state: BuilderState;
  materializedRoots: readonly MaterializedContentRoot[];
  /**
   * Scope-aware readers can merge every root namespace while projecting the
   * children of only the render scope they are currently reading.
   */
  includeRootChildren?: (
    identity: ContentBlockExternalContentIdentity
  ) => boolean;
  validateSource: boolean;
}): ContentStorageProjection => {
  if (materializedRoots.length === 0) {
    return {
      state,
      externalRootByBlockId: new Map(),
      externalRootByInstanceId: new Map(),
      externalRootByDataSourceId: new Map(),
      externalRootByResourceId: new Map(),
      externalRootByStyleSourceId: new Map(),
      externalRootByStyleDeclKey: new Map(),
    };
  }

  const projectedState: BuilderState = {
    ...state,
    instances: new Map(state.instances),
  };
  const externalRootByBlockId = new Map<
    Instance["id"],
    ContentBlockExternalContentIdentity
  >();
  const externalRootByInstanceId = new Map<
    Instance["id"],
    ContentBlockExternalContentIdentity
  >();
  const externalRootByDataSourceId = new Map<
    string,
    ContentBlockExternalContentIdentity
  >();
  const externalRootByResourceId = new Map<
    string,
    ContentBlockExternalContentIdentity
  >();
  const externalRootByStyleSourceId = new Map<
    string,
    ContentBlockExternalContentIdentity
  >();
  const externalRootByStyleDeclKey = new Map<
    string,
    ContentBlockExternalContentIdentity
  >();

  for (const { identity } of materializedRoots) {
    if (includeRootChildren?.(identity) === false) {
      continue;
    }
    if (externalRootByBlockId.has(identity.blockInstanceId)) {
      throw new Error(
        `Content Block "${identity.blockInstanceId}" can project only one render scope`
      );
    }
    externalRootByBlockId.set(identity.blockInstanceId, identity);
  }

  const pendingRoots = [...materializedRoots];
  const validatedBlockIds = new Set<Instance["id"]>();
  while (pendingRoots.length > 0) {
    const rootIndex = pendingRoots.findIndex(({ identity }) =>
      projectedState.instances?.has(identity.blockInstanceId)
    );
    if (rootIndex === -1) {
      throw new Error(
        `Materialized content block "${pendingRoots[0].identity.blockInstanceId}" is missing`
      );
    }
    const [{ identity, fragment }] = pendingRoots.splice(rootIndex, 1);
    const block = validatedBlockIds.has(identity.blockInstanceId)
      ? projectedState.instances?.get(identity.blockInstanceId)
      : assertExternalBlockStorage({
          state: projectedState,
          identity,
          validateSource,
        });
    if (block === undefined) {
      throw new Error(
        `Materialized content block "${identity.blockInstanceId}" is missing`
      );
    }
    validatedBlockIds.add(identity.blockInstanceId);
    assertFragmentInstanceReferences(fragment);
    const projectedInstances = projectItemsById({
      current: projectedState.instances,
      items: fragment.instances,
      namespace: "instance",
      rejectCollision: true,
    });
    if (projectedInstances === undefined) {
      throw new Error("Materialized content has no instances");
    }
    projectedState.instances = projectedInstances;
    if (includeRootChildren?.(identity) !== false) {
      projectedState.instances.set(block.id, {
        ...block,
        children: [...block.children, ...fragment.children],
      });
    }
    projectedState.props = projectItemsById({
      current: projectedState.props,
      items: fragment.props,
      namespace: "prop",
      rejectCollision: true,
    });
    projectedState.assets = projectItemsById({
      current: projectedState.assets,
      items: fragment.assets,
      namespace: "asset",
    });
    projectedState.dataSources = projectItemsById({
      current: projectedState.dataSources,
      items: fragment.dataSources,
      namespace: "data source",
      rejectCollision: true,
    });
    projectedState.resources = projectItemsById({
      current: projectedState.resources,
      items: fragment.resources,
      namespace: "resource",
      rejectCollision: true,
    });
    projectedState.breakpoints = projectItemsById({
      current: projectedState.breakpoints,
      items: fragment.breakpoints,
      namespace: "breakpoint",
    });
    projectedState.styleSources = projectItemsById({
      current: projectedState.styleSources,
      items: fragment.styleSources,
      namespace: "style source",
      rejectCollision: (styleSource) => styleSource.type === "local",
    });
    if (fragment.styleSourceSelections.length > 0) {
      const selections = new Map(projectedState.styleSourceSelections);
      for (const selection of fragment.styleSourceSelections) {
        if (selections.has(selection.instanceId)) {
          throw new Error(
            `Materialized content style selection instance id "${selection.instanceId}" is not scope-local`
          );
        }
        selections.set(selection.instanceId, selection);
      }
      projectedState.styleSourceSelections = selections;
    }
    if (fragment.styles.length > 0) {
      const styles = new Map(projectedState.styles);
      for (const style of fragment.styles) {
        const key = getStyleDeclKey(style);
        const existing = styles.get(key);
        if (existing !== undefined && equal(existing, style) === false) {
          throw new Error(
            `Materialized content style "${key}" conflicts with project data`
          );
        }
        if (existing === undefined) {
          styles.set(key, style);
        }
      }
      projectedState.styles = styles;
    }
    for (const instance of fragment.instances) {
      externalRootByInstanceId.set(instance.id, identity);
    }
    for (const dataSource of fragment.dataSources) {
      externalRootByDataSourceId.set(dataSource.id, identity);
    }
    for (const resource of fragment.resources) {
      externalRootByResourceId.set(resource.id, identity);
    }
    for (const styleSource of fragment.styleSources) {
      if (styleSource.type === "local") {
        externalRootByStyleSourceId.set(styleSource.id, identity);
      }
    }
    for (const style of fragment.styles) {
      externalRootByStyleDeclKey.set(getStyleDeclKey(style), identity);
    }
  }

  return {
    state: projectedState,
    externalRootByBlockId,
    externalRootByInstanceId,
    externalRootByDataSourceId,
    externalRootByResourceId,
    externalRootByStyleSourceId,
    externalRootByStyleDeclKey,
  };
};

export const createContentStorageProjection = (args: {
  state: BuilderState;
  materializedRoots: readonly MaterializedContentRoot[];
}): ContentStorageProjection =>
  createContentStorageProjectionInternal({
    ...args,
    validateSource: true,
  });

export const createContentStorageSelectorProjection = ({
  state,
  materializedRoots,
  allowStaleSource = false,
}: {
  state: BuilderState;
  materializedRoots: readonly MaterializedContentRoot[];
  allowStaleSource?: boolean;
}): ContentStorageSelectorProjection => {
  // Builder reads keep the previous materialization visible while a changed
  // source is loading. Mutations must continue to use the strict projection
  // and exact storage identity checks above.
  const projection = createContentStorageProjectionInternal({
    state,
    materializedRoots,
    includeRootChildren: () => false,
    validateSource: allowStaleSource === false,
  });
  const rootByScope = new Map(
    materializedRoots.map((root) => [
      JSON.stringify([
        root.identity.blockInstanceId,
        root.identity.renderScope,
      ]),
      root,
    ])
  );
  return {
    state: projection.state,
    getInstanceChildren: (instance, renderScope) => {
      if (instance.component !== blockComponent) {
        return instance.children;
      }
      const root = rootByScope.get(JSON.stringify([instance.id, renderScope]));
      if (root === undefined) {
        return instance.children;
      }
      return [...instance.children, ...root.fragment.children];
    },
  };
};

const projectStorageRoot = { type: "project" } as const;

const isSameContentStorageRoot = (
  left: ContentStorageRoot,
  right: ContentStorageRoot
) =>
  left.type === right.type &&
  (left.type === "project" ||
    (right.type === "external" &&
      left.identity.blockInstanceId === right.identity.blockInstanceId));

export const resolveContentStorageRoot = (
  projection: ContentStorageProjection,
  target: ContentStorageTarget
): ContentStorageRoot => {
  const identity =
    target.type === "children"
      ? (projection.externalRootByBlockId.get(target.parentInstanceId) ??
        projection.externalRootByInstanceId.get(target.parentInstanceId))
      : projection.externalRootByInstanceId.get(target.instanceId);
  return identity === undefined
    ? projectStorageRoot
    : { type: "external", identity };
};

const prepareExternalMutationPayload = ({
  projection,
  root,
  payload,
  transferredRecordIds = new Map(),
  validationSkippedRecordIds = transferredRecordIds,
}: {
  projection: ContentStorageProjection;
  root: Extract<ContentStorageRoot, { type: "external" }>;
  payload: BuilderPatchChange[];
  transferredRecordIds?: ReadonlyMap<
    BuilderPatchChange["namespace"],
    ReadonlySet<string>
  >;
  validationSkippedRecordIds?: ReadonlyMap<
    BuilderPatchChange["namespace"],
    ReadonlySet<string>
  >;
}) => {
  const validationPayload: BuilderPatchChange[] = [];
  const storagePayload: ContentStoragePatchChange[] = [];
  const block = projection.state.instances?.get(root.identity.blockInstanceId);
  if (block === undefined) {
    throw new Error(
      `Materialized content block "${root.identity.blockInstanceId}" is missing`
    );
  }
  const templateChildren = block.children.filter(
    (child) =>
      child.type === "id" &&
      projection.state.instances?.get(child.value)?.component ===
        blockTemplateComponent
  );
  for (const change of payload) {
    const validationPatches = [];
    const namespacePatches = [];
    const fragmentPatches = [];
    for (const patch of change.patches) {
      const [instanceId, field, childIndex] = patch.path;
      const isTransferredRecord =
        typeof instanceId === "string" &&
        patch.path.length === 1 &&
        validationSkippedRecordIds.get(change.namespace)?.has(instanceId) ===
          true;
      if (
        change.namespace === "instances" &&
        typeof instanceId === "string" &&
        projection.state.instances?.has(instanceId) &&
        transferredRecordIds.get("instances")?.has(instanceId) !== true
      ) {
        const patchRoot = resolveContentStorageRoot(
          projection,
          field === "children"
            ? { type: "children", parentInstanceId: instanceId }
            : { type: "instance", instanceId }
        );
        if (
          patchRoot.type !== "external" ||
          patchRoot.identity.blockInstanceId !== root.identity.blockInstanceId
        ) {
          return throwBuilderRuntimeError(
            "BAD_REQUEST",
            "Mutation crosses an authored storage boundary."
          );
        }
      }
      if (
        change.namespace !== "instances" ||
        instanceId !== block.id ||
        field !== "children"
      ) {
        if (isTransferredRecord === false) {
          validationPatches.push(patch);
        }
        namespacePatches.push(patch);
        continue;
      }
      if (patch.path.length === 3 && typeof childIndex === "number") {
        const externalIndex = childIndex - templateChildren.length;
        if (externalIndex < 0) {
          return throwBuilderRuntimeError(
            "BAD_REQUEST",
            "Templates content is not editable in content mode."
          );
        }
        validationPatches.push(patch);
        fragmentPatches.push({
          ...patch,
          path: ["children", externalIndex],
        });
        continue;
      }
      if (
        patch.path.length === 2 &&
        patch.op !== "remove" &&
        Array.isArray(patch.value)
      ) {
        const externalChildren = patch.value.filter(
          (child) =>
            typeof child !== "object" ||
            child === null ||
            !("type" in child) ||
            child.type !== "id" ||
            !("value" in child) ||
            projection.state.instances?.get(String(child.value))?.component !==
              blockTemplateComponent
        );
        validationPatches.push({
          ...patch,
          value: [...templateChildren, ...externalChildren],
        });
        fragmentPatches.push({
          ...patch,
          path: ["children"],
          value: externalChildren,
        });
        continue;
      }
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Content Block root mutation is not supported."
      );
    }
    if (validationPatches.length > 0) {
      validationPayload.push({ ...change, patches: validationPatches });
    }
    if (namespacePatches.length > 0) {
      storagePayload.push({ ...change, patches: namespacePatches });
    }
    if (fragmentPatches.length > 0) {
      storagePayload.push({ namespace: "fragment", patches: fragmentPatches });
    }
  }
  return { validationPayload, storagePayload };
};

const createExternalStorageChange = ({
  projection,
  root,
  payload,
  transferredRecordIds,
  validationSkippedRecordIds,
  validationState = projection.state,
}: {
  projection: ContentStorageProjection;
  root: Extract<ContentStorageRoot, { type: "external" }>;
  payload: BuilderPatchChange[];
  transferredRecordIds?: ReadonlyMap<
    BuilderPatchChange["namespace"],
    ReadonlySet<string>
  >;
  validationSkippedRecordIds?: ReadonlyMap<
    BuilderPatchChange["namespace"],
    ReadonlySet<string>
  >;
  validationState?: BuilderState;
}) => {
  const { validationPayload, storagePayload } = prepareExternalMutationPayload({
    projection,
    root,
    payload,
    transferredRecordIds,
    validationSkippedRecordIds,
  });
  const validation = validateContentModeTransaction({
    capabilities: getContentModeCapabilities({
      instances: validationState.instances ?? new Map(),
      metas: componentMetas,
      props: validationState.props ?? new Map(),
      styleSources: validationState.styleSources ?? new Map(),
      styleSourceSelections: validationState.styleSourceSelections ?? new Map(),
      styles: validationState.styles ?? new Map(),
      breakpoints: validationState.breakpoints,
      contentRootIds: new Set([root.identity.blockInstanceId]),
    }),
    transaction: { payload: validationPayload },
  });
  if (validation.success === false) {
    return throwBuilderRuntimeError("BAD_REQUEST", validation.error);
  }
  return storagePayload.length === 0
    ? undefined
    : { root, payload: storagePayload };
};

const isProtectedTemplatesList = ({
  projection,
  materializedRoots,
  instanceId,
}: {
  projection: ContentStorageProjection;
  materializedRoots: readonly MaterializedContentRoot[];
  instanceId: Instance["id"];
}) =>
  materializedRoots.some(({ identity }) =>
    projection.state.instances
      ?.get(identity.blockInstanceId)
      ?.children.some(
        (child) =>
          child.type === "id" &&
          child.value === instanceId &&
          projection.state.instances?.get(child.value)?.component ===
            blockTemplateComponent
      )
  );

export const executeContentStorageMutation = <
  Mutation extends BuilderRuntimeMutation,
>({
  state,
  materializedRoots,
  returnStorageChanges,
  target,
  source,
  protectTemplatesList,
  protectedInstanceIds = [],
  crossRootError = "Mutation crosses an authored storage boundary.",
  allowCrossRoot = false,
  copySourceInstanceId,
  mdxInsert,
  validationSkippedNamespaces = [],
  execute,
}: {
  state: BuilderState;
  materializedRoots?: readonly MaterializedContentRoot[];
  returnStorageChanges?: boolean;
  target: ContentStorageTargetResolver;
  source?: ContentStorageTarget;
  protectTemplatesList?: boolean;
  protectedInstanceIds?: readonly Instance["id"][];
  crossRootError?: string;
  allowCrossRoot?: boolean;
  copySourceInstanceId?: Instance["id"];
  mdxInsert?: Readonly<{
    source: string;
    parentInstanceId: Instance["id"];
    childIndex: number;
    position: "append" | "prepend" | "replace" | "index";
  }>;
  validationSkippedNamespaces?: readonly BuilderPatchChange["namespace"][];
  execute: (
    state: BuilderState,
    root: ContentStorageRoot,
    sourceRoot?: ContentStorageRoot
  ) => Mutation;
}): Mutation => {
  if (materializedRoots === undefined || materializedRoots.length === 0) {
    return execute(state, projectStorageRoot);
  }
  const projection = createContentStorageProjection({
    state,
    materializedRoots,
  });
  const resolvedTarget =
    typeof target === "function" ? target(projection.state) : target;
  if (
    protectTemplatesList === true &&
    [
      resolvedTarget,
      source,
      ...protectedInstanceIds.map(
        (instanceId) =>
          ({ type: "instance", instanceId }) satisfies ContentStorageTarget
      ),
    ].some(
      (candidate) =>
        candidate?.type === "instance" &&
        isProtectedTemplatesList({
          projection,
          materializedRoots,
          instanceId: candidate.instanceId,
        })
    )
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "The source-backed Content Block Templates list cannot be changed."
    );
  }
  const root = resolveContentStorageRoot(projection, resolvedTarget);
  const sourceRoot =
    source === undefined
      ? undefined
      : resolveContentStorageRoot(projection, source);
  if (
    sourceRoot !== undefined &&
    isSameContentStorageRoot(sourceRoot, root) === false &&
    allowCrossRoot === false
  ) {
    return throwBuilderRuntimeError("BAD_REQUEST", crossRootError);
  }
  if (root.type === "project") {
    const executionState =
      allowCrossRoot && sourceRoot?.type === "external"
        ? projection.state
        : state;
    return execute(executionState, root, sourceRoot);
  }
  if (returnStorageChanges !== true) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "The caller must handle authored storage changes."
    );
  }

  const mutation = execute(projection.state, root, sourceRoot);
  const validationSkippedRecordIds = new Map<
    BuilderPatchChange["namespace"],
    Set<string>
  >();
  for (const change of mutation.payload) {
    if (validationSkippedNamespaces.includes(change.namespace) === false) {
      continue;
    }
    const ids = new Set<string>();
    for (const patch of change.patches) {
      const [id] = patch.path;
      if (typeof id === "string" && patch.path.length === 1) {
        ids.add(id);
      }
    }
    if (ids.size > 0) {
      validationSkippedRecordIds.set(change.namespace, ids);
    }
  }
  const storageChange = createExternalStorageChange({
    projection,
    root,
    payload: mutation.payload,
    validationSkippedRecordIds,
  });
  let annotatedStorageChange: ContentStorageChange | undefined = storageChange;
  if (copySourceInstanceId !== undefined && sourceRoot !== undefined) {
    annotatedStorageChange = {
      root,
      payload: storageChange?.payload ?? [],
      copySource: {
        root: sourceRoot,
        instanceId: copySourceInstanceId,
      },
    };
  }
  if (mdxInsert !== undefined) {
    const result = mutation.result as Record<string, unknown>;
    if (
      Array.isArray(result.instanceIds) === false ||
      Array.isArray(result.rootInstanceIds) === false
    ) {
      throw new Error("MDX insertion result is missing inserted instance ids");
    }
    annotatedStorageChange = {
      ...(annotatedStorageChange ?? { root, payload: [] }),
      mdxInsert: {
        ...mdxInsert,
        instanceIds: result.instanceIds as string[],
        rootInstanceIds: result.rootInstanceIds as string[],
      },
    };
  }
  const storageChanges =
    annotatedStorageChange === undefined
      ? mutation.storageChanges
      : [...(mutation.storageChanges ?? []), annotatedStorageChange];
  return {
    ...mutation,
    payload: [],
    storageChanges,
    noop: storageChanges?.some(hasContentStorageChange) !== true,
  } as Mutation;
};

export const executeContentStorageTextReplacement = <
  Mutation extends BuilderRuntimeMutation,
>({
  state,
  materializedRoots,
  returnStorageChanges,
  execute,
}: {
  state: BuilderState;
  materializedRoots?: readonly MaterializedContentRoot[];
  returnStorageChanges?: boolean;
  execute: (state: BuilderState) => Mutation;
}): Mutation => {
  if (materializedRoots === undefined || materializedRoots.length === 0) {
    return execute(state);
  }
  const projection = createContentStorageProjection({
    state,
    materializedRoots,
  });
  const mutation = execute(projection.state);
  const projectPatches: BuilderPatchChange["patches"] = [];
  const externalPatches = new Map<
    Instance["id"],
    {
      root: Extract<ContentStorageRoot, { type: "external" }>;
      patches: BuilderPatchChange["patches"];
    }
  >();
  for (const change of mutation.payload) {
    if (change.namespace !== "instances") {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Text replacement produced an unsupported patch."
      );
    }
    for (const patch of change.patches) {
      const [instanceId, field] = patch.path;
      if (typeof instanceId !== "string" || field !== "children") {
        return throwBuilderRuntimeError(
          "BAD_REQUEST",
          "Text replacement produced an unsupported patch."
        );
      }
      const root = resolveContentStorageRoot(projection, {
        type: "children",
        parentInstanceId: instanceId,
      });
      if (root.type === "project") {
        projectPatches.push(patch);
        continue;
      }
      const group = externalPatches.get(root.identity.blockInstanceId) ?? {
        root,
        patches: [],
      };
      group.patches.push(patch);
      externalPatches.set(root.identity.blockInstanceId, group);
    }
  }
  if (externalPatches.size > 0 && returnStorageChanges !== true) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "The caller must handle authored storage changes."
    );
  }
  const storageChanges = Array.from(externalPatches.values()).flatMap(
    ({ root, patches }) => {
      const change = createExternalStorageChange({
        projection,
        root,
        payload: [{ namespace: "instances", patches }],
      });
      return change === undefined ? [] : [change];
    }
  );
  const combinedStorageChanges = [
    ...(mutation.storageChanges ?? []),
    ...storageChanges,
  ];
  return {
    ...mutation,
    payload:
      projectPatches.length === 0
        ? []
        : [{ namespace: "instances", patches: projectPatches }],
    storageChanges:
      combinedStorageChanges.length === 0 ? undefined : combinedStorageChanges,
    noop: projectPatches.length === 0 && combinedStorageChanges.length === 0,
  } as Mutation;
};

const getPatchedProp = (
  projection: ContentStorageProjection,
  patch: BuilderPatchChange["patches"][number]
) => {
  const [propId, field] = patch.path;
  if (typeof propId !== "string" || patch.op === "remove") {
    return;
  }
  if (patch.path.length === 1) {
    const parsed = propSchema.safeParse(patch.value);
    return parsed.success ? parsed.data : undefined;
  }
  if (patch.path.length === 2 && field === "value") {
    const existing = projection.state.props?.get(propId);
    if (existing !== undefined) {
      return { ...existing, value: patch.value } as typeof existing;
    }
  }
};

const getPropStorageRoot = (
  projection: ContentStorageProjection,
  patch: BuilderPatchChange["patches"][number]
) => {
  const [propId] = patch.path;
  const prop =
    getPatchedProp(projection, patch) ??
    (typeof propId === "string"
      ? projection.state.props?.get(propId)
      : undefined);
  if (prop === undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", "Prop owner is missing.");
  }
  const root = resolveContentStorageRoot(projection, {
    type: "instance",
    instanceId: prop.instanceId,
  });
  if (typeof propId === "string") {
    const existing = projection.state.props?.get(propId);
    if (existing !== undefined) {
      const existingRoot = resolveContentStorageRoot(projection, {
        type: "instance",
        instanceId: existing.instanceId,
      });
      if (isSameContentStorageRoot(root, existingRoot) === false) {
        return throwBuilderRuntimeError(
          "BAD_REQUEST",
          "Prop mutation crosses an authored storage boundary."
        );
      }
    }
  }
  return root;
};

const validateExternalReferenceOwnership = ({
  root,
  referenceRoot,
  error,
}: {
  root: ContentStorageRoot;
  referenceRoot: ContentStorageRoot;
  error: string;
}) => {
  if (
    referenceRoot.type === "external" &&
    isSameContentStorageRoot(root, referenceRoot) === false
  ) {
    return throwBuilderRuntimeError("BAD_REQUEST", error);
  }
};

const getDataSourceReferenceRoot = ({
  projection,
  root,
  dataSourceId,
  ownedDataSourceIds,
}: {
  projection: ContentStorageProjection;
  root: ContentStorageRoot;
  dataSourceId: string;
  ownedDataSourceIds: ReadonlySet<string>;
}): ContentStorageRoot => {
  if (ownedDataSourceIds.has(dataSourceId)) {
    return root;
  }
  const identity = projection.externalRootByDataSourceId.get(dataSourceId);
  return identity === undefined
    ? projectStorageRoot
    : { type: "external", identity };
};

const validateExpressionReferenceOwnership = ({
  projection,
  root,
  expression,
  ownedDataSourceIds = new Set(),
  error,
}: {
  projection: ContentStorageProjection;
  root: ContentStorageRoot;
  expression: string;
  ownedDataSourceIds?: ReadonlySet<string>;
  error: string;
}) => {
  for (const identifier of getExpressionIdentifiers(expression)) {
    const dataSourceId = decodeDataVariableId(identifier);
    if (dataSourceId === undefined) {
      continue;
    }
    validateExternalReferenceOwnership({
      root,
      referenceRoot: getDataSourceReferenceRoot({
        projection,
        root,
        dataSourceId,
        ownedDataSourceIds,
      }),
      error,
    });
  }
};

const listResourceExpressions = (resource: Resource) => [
  resource.url,
  ...resource.headers.map(({ value }) => value),
  ...(resource.searchParams?.map(({ value }) => value) ?? []),
  ...(resource.body === undefined ? [] : [resource.body]),
];

const validatePropReferenceOwnership = ({
  projection,
  root,
  prop,
  ownedInstanceIds = new Set(),
  ownedDataSourceIds = new Set(),
  ownedResourceIds = new Set(),
  error = "Prop reference crosses an authored storage boundary.",
}: {
  projection: ContentStorageProjection;
  root: ContentStorageRoot;
  prop: Prop;
  ownedInstanceIds?: ReadonlySet<string>;
  ownedDataSourceIds?: ReadonlySet<string>;
  ownedResourceIds?: ReadonlySet<string>;
  error?: string;
}) => {
  const referenceRoots: ContentStorageRoot[] = [];
  if (prop.type === "parameter") {
    referenceRoots.push(
      getDataSourceReferenceRoot({
        projection,
        root,
        dataSourceId: prop.value,
        ownedDataSourceIds,
      })
    );
  } else if (prop.type === "resource") {
    const identity = projection.externalRootByResourceId.get(prop.value);
    referenceRoots.push(
      ownedResourceIds.has(prop.value)
        ? root
        : identity === undefined
          ? projectStorageRoot
          : { type: "external", identity }
    );
  } else if (
    prop.type === "page" &&
    typeof prop.value === "object" &&
    prop.value !== null
  ) {
    referenceRoots.push(
      ownedInstanceIds.has(prop.value.instanceId)
        ? root
        : resolveContentStorageRoot(projection, {
            type: "instance",
            instanceId: prop.value.instanceId,
          })
    );
  }
  for (const { expression } of listPropExpressions(prop)) {
    validateExpressionReferenceOwnership({
      projection,
      root,
      expression,
      ownedDataSourceIds,
      error,
    });
  }
  for (const referenceRoot of referenceRoots) {
    validateExternalReferenceOwnership({ root, referenceRoot, error });
  }
};

export const executeContentStoragePropMutation = <
  Mutation extends BuilderRuntimeMutation,
>({
  state,
  materializedRoots,
  returnStorageChanges,
  execute,
}: {
  state: BuilderState;
  materializedRoots?: readonly MaterializedContentRoot[];
  returnStorageChanges?: boolean;
  execute: (state: BuilderState) => Mutation;
}): Mutation => {
  if (materializedRoots === undefined || materializedRoots.length === 0) {
    return execute(state);
  }
  const projection = createContentStorageProjection({
    state,
    materializedRoots,
  });
  const mutation = execute(projection.state);
  const projectChanges = new Map<
    BuilderPatchChange["namespace"],
    BuilderPatchChange
  >();
  const externalChanges = new Map<
    Instance["id"],
    {
      root: Extract<ContentStorageRoot, { type: "external" }>;
      changes: Map<BuilderPatchChange["namespace"], BuilderPatchChange>;
    }
  >();
  for (const change of mutation.payload) {
    for (const patch of change.patches) {
      let root: ContentStorageRoot;
      if (change.namespace === "props") {
        root = getPropStorageRoot(projection, patch);
        const prop = getPatchedProp(projection, patch);
        if (prop !== undefined) {
          validatePropReferenceOwnership({ projection, root, prop });
        }
      } else if (change.namespace === "resources") {
        const [resourceId] = patch.path;
        if (typeof resourceId !== "string") {
          return throwBuilderRuntimeError(
            "BAD_REQUEST",
            "Resource owner is missing."
          );
        }
        const identity = projection.externalRootByResourceId.get(resourceId);
        root =
          identity === undefined
            ? projectStorageRoot
            : { type: "external", identity };
      } else {
        return throwBuilderRuntimeError(
          "BAD_REQUEST",
          "Prop mutation produced an unsupported patch."
        );
      }
      const changes =
        root.type === "project"
          ? projectChanges
          : (externalChanges.get(root.identity.blockInstanceId)?.changes ??
            new Map());
      const accumulated = changes.get(change.namespace) ?? {
        namespace: change.namespace,
        patches: [],
      };
      accumulated.patches.push(patch);
      changes.set(change.namespace, accumulated);
      if (root.type === "external") {
        externalChanges.set(root.identity.blockInstanceId, { root, changes });
      }
    }
  }
  if (externalChanges.size > 0 && returnStorageChanges !== true) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "The caller must handle authored storage changes."
    );
  }
  const storageChanges = Array.from(externalChanges.values()).flatMap(
    ({ root, changes }) => {
      const storageChange = createExternalStorageChange({
        projection,
        root,
        payload: Array.from(changes.values()),
      });
      return storageChange === undefined ? [] : [storageChange];
    }
  );
  const combinedStorageChanges = [
    ...(mutation.storageChanges ?? []),
    ...storageChanges,
  ];
  return {
    ...mutation,
    payload: Array.from(projectChanges.values()),
    storageChanges:
      combinedStorageChanges.length === 0 ? undefined : combinedStorageChanges,
    noop: projectChanges.size === 0 && combinedStorageChanges.length === 0,
  } as Mutation;
};

const getExistingRecordStorageRoot = ({
  identity,
  exists,
}: {
  identity: ContentBlockExternalContentIdentity | undefined;
  exists: boolean;
}): ContentStorageRoot => {
  if (identity !== undefined) {
    return { type: "external", identity };
  }
  if (exists) {
    return projectStorageRoot;
  }
  return throwBuilderRuntimeError(
    "BAD_REQUEST",
    "Structural mutation owner is missing."
  );
};

const getStructuralPatchRoot = ({
  projection,
  change,
  patch,
}: {
  projection: ContentStorageProjection;
  change: BuilderPatchChange;
  patch: BuilderPatchChange["patches"][number];
}): ContentStorageRoot => {
  const [id, field] = patch.path;
  if (typeof id !== "string") {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Structural mutation owner is missing."
    );
  }
  if (change.namespace === "instances") {
    if (projection.state.instances?.has(id) === false) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Structural mutation cannot create instances while partitioning roots."
      );
    }
    return resolveContentStorageRoot(
      projection,
      field === "children"
        ? { type: "children", parentInstanceId: id }
        : { type: "instance", instanceId: id }
    );
  }
  if (change.namespace === "props") {
    const root = getPropStorageRoot(projection, patch);
    const prop = getPatchedProp(projection, patch);
    if (prop !== undefined) {
      validatePropReferenceOwnership({ projection, root, prop });
    }
    return root;
  }
  if (change.namespace === "styleSourceSelections") {
    return resolveContentStorageRoot(projection, {
      type: "instance",
      instanceId: id,
    });
  }
  if (change.namespace === "dataSources") {
    return getExistingRecordStorageRoot({
      identity: projection.externalRootByDataSourceId.get(id),
      exists: projection.state.dataSources?.has(id) === true,
    });
  }
  if (change.namespace === "resources") {
    return getExistingRecordStorageRoot({
      identity: projection.externalRootByResourceId.get(id),
      exists: projection.state.resources?.has(id) === true,
    });
  }
  if (change.namespace === "styleSources") {
    return getExistingRecordStorageRoot({
      identity: projection.externalRootByStyleSourceId.get(id),
      exists: projection.state.styleSources?.has(id) === true,
    });
  }
  if (change.namespace === "styles") {
    return getExistingRecordStorageRoot({
      identity: projection.externalRootByStyleDeclKey.get(id),
      exists: projection.state.styles?.has(id) === true,
    });
  }
  if (change.namespace === "pages") {
    return projectStorageRoot;
  }
  return throwBuilderRuntimeError(
    "BAD_REQUEST",
    `Structural mutation produced unsupported namespace "${change.namespace}".`
  );
};

export const executeContentStorageStructuralMutation = <
  Mutation extends BuilderRuntimeMutation,
>({
  state,
  materializedRoots,
  returnStorageChanges,
  protectedInstanceIds = [],
  rootPairs = [],
  ownershipTransfers = [],
  execute,
}: {
  state: BuilderState;
  materializedRoots?: readonly MaterializedContentRoot[];
  returnStorageChanges?: boolean;
  protectedInstanceIds?: readonly Instance["id"][];
  rootPairs?: readonly Readonly<{
    source: ContentStorageTarget;
    target: ContentStorageTarget;
  }>[];
  ownershipTransfers?: readonly ContentStorageOwnershipTransfer[];
  execute: (state: BuilderState) => Mutation;
}): Mutation => {
  if (materializedRoots === undefined || materializedRoots.length === 0) {
    return execute(state);
  }
  const projection = createContentStorageProjection({
    state,
    materializedRoots,
  });
  for (const instanceId of protectedInstanceIds) {
    if (
      isProtectedTemplatesList({
        projection,
        materializedRoots,
        instanceId,
      })
    ) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "The source-backed Content Block Templates list cannot be changed."
      );
    }
  }
  let hasExternalPair = false;
  for (const pair of rootPairs) {
    const sourceRoot = resolveContentStorageRoot(projection, pair.source);
    const targetRoot = resolveContentStorageRoot(projection, pair.target);
    if (
      isSameContentStorageRoot(sourceRoot, targetRoot) === false &&
      ownershipTransfers.some(
        (transfer) =>
          isSameContentStorageRoot(
            resolveContentStorageRoot(projection, transfer.source),
            sourceRoot
          ) &&
          isSameContentStorageRoot(
            resolveContentStorageRoot(projection, transfer.target),
            targetRoot
          )
      ) === false
    ) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Moving content across authored storage roots is not supported."
      );
    }
    hasExternalPair ||=
      sourceRoot.type === "external" || targetRoot.type === "external";
  }
  if (rootPairs.length > 0 && hasExternalPair === false) {
    return execute(state);
  }
  const ownershipTransferPlans = ownershipTransfers.flatMap((transfer) => {
    const sourceRoot = resolveContentStorageRoot(projection, transfer.source);
    const targetRoot = resolveContentStorageRoot(projection, transfer.target);
    if (isSameContentStorageRoot(sourceRoot, targetRoot)) {
      return [];
    }
    const instanceIds = new Set<Instance["id"]>();
    const visit = (instanceId: Instance["id"]) => {
      if (instanceIds.has(instanceId)) {
        return;
      }
      const instance = projection.state.instances?.get(instanceId);
      if (
        instance === undefined ||
        isSameContentStorageRoot(
          resolveContentStorageRoot(projection, {
            type: "instance",
            instanceId,
          }),
          sourceRoot
        ) === false
      ) {
        return;
      }
      instanceIds.add(instanceId);
      for (const child of instance.children) {
        if (child.type === "id") {
          visit(child.value);
        }
      }
    };
    visit(transfer.rootInstanceId);
    if (instanceIds.size === 0) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Transferred subtree is missing from its authored storage root."
      );
    }
    if (
      Array.from(instanceIds).some(
        (instanceId) =>
          projection.state.instances?.get(instanceId)?.component ===
          blockTemplateComponent
      )
    ) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "A subtree containing Content Block Templates cannot change storage ownership."
      );
    }
    return [{ transfer, sourceRoot, targetRoot, instanceIds }];
  });
  const transferTargets = new Map<string, Set<string>>();
  for (const { sourceRoot, targetRoot } of ownershipTransferPlans) {
    const sourceKey = getContentStorageRootKey(sourceRoot);
    const targets = transferTargets.get(sourceKey) ?? new Set<string>();
    targets.add(getContentStorageRootKey(targetRoot));
    transferTargets.set(sourceKey, targets);
  }
  const visitedRoots = new Set<string>();
  const visitingRoots = new Set<string>();
  const hasTransferCycle = (rootKey: string): boolean => {
    if (visitingRoots.has(rootKey)) {
      return true;
    }
    if (visitedRoots.has(rootKey)) {
      return false;
    }
    visitingRoots.add(rootKey);
    for (const targetKey of transferTargets.get(rootKey) ?? []) {
      if (hasTransferCycle(targetKey)) {
        return true;
      }
    }
    visitingRoots.delete(rootKey);
    visitedRoots.add(rootKey);
    return false;
  };
  if (Array.from(transferTargets.keys()).some(hasTransferCycle)) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Cyclic cross-root ownership transfers are not supported by serial persistence."
    );
  }
  const transferredInstanceIds = new Set<Instance["id"]>();
  for (const { instanceIds } of ownershipTransferPlans) {
    for (const instanceId of instanceIds) {
      if (transferredInstanceIds.has(instanceId)) {
        return throwBuilderRuntimeError(
          "BAD_REQUEST",
          "Overlapping cross-root ownership transfers are not supported."
        );
      }
      transferredInstanceIds.add(instanceId);
    }
  }
  for (const { transfer } of ownershipTransferPlans) {
    const targetInstanceId =
      transfer.target.type === "children"
        ? transfer.target.parentInstanceId
        : transfer.target.instanceId;
    if (transferredInstanceIds.has(targetInstanceId)) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "A cross-root transfer target cannot change ownership in the same mutation."
      );
    }
  }
  const mutation = execute(projection.state);
  const afterState = applyBuilderPatchTransactions(projection.state, [
    { id: "content-storage-ownership-transfer", payload: mutation.payload },
  ]).state;
  const projectChanges = new Map<
    BuilderPatchChange["namespace"],
    BuilderPatchChange
  >();
  const externalChanges = new Map<
    Instance["id"],
    {
      root: Extract<ContentStorageRoot, { type: "external" }>;
      changes: Map<BuilderPatchChange["namespace"], BuilderPatchChange>;
    }
  >();
  const addPatch = (
    root: ContentStorageRoot,
    namespace: BuilderPatchChange["namespace"],
    patch: BuilderPatchChange["patches"][number]
  ) => {
    const changes =
      root.type === "project"
        ? projectChanges
        : (externalChanges.get(root.identity.blockInstanceId)?.changes ??
          new Map());
    const accumulated = changes.get(namespace) ?? { namespace, patches: [] };
    accumulated.patches.push(patch);
    changes.set(namespace, accumulated);
    if (root.type === "external") {
      externalChanges.set(root.identity.blockInstanceId, { root, changes });
    }
  };
  const transferredRecordIds = new Map<
    BuilderPatchChange["namespace"],
    Set<string>
  >();
  const validationRemovedRecordIdsByBlockId = new Map<
    Instance["id"],
    Map<BuilderPatchChange["namespace"], Set<string>>
  >();
  const validationSkippedRecordIdsByBlockId = new Map<
    Instance["id"],
    Map<BuilderPatchChange["namespace"], Set<string>>
  >();
  const incomingInstanceIdsByBlockId = new Map<
    Instance["id"],
    Set<Instance["id"]>
  >();
  const markTransferred = (
    namespace: BuilderPatchChange["namespace"],
    id: string
  ) => {
    const ids = transferredRecordIds.get(namespace) ?? new Set();
    ids.add(id);
    transferredRecordIds.set(namespace, ids);
  };
  for (const {
    sourceRoot,
    targetRoot,
    instanceIds,
  } of ownershipTransferPlans) {
    const recordIds = new Map<BuilderPatchChange["namespace"], Set<string>>([
      ["instances", instanceIds],
    ]);
    const collect = (
      namespace: BuilderPatchChange["namespace"],
      entries: Iterable<readonly [string, unknown]>,
      include: (value: never) => boolean
    ) => {
      const ids = new Set<string>();
      for (const [id, value] of entries) {
        if (include(value as never)) {
          ids.add(id);
        }
      }
      if (ids.size > 0) {
        recordIds.set(namespace, ids);
      }
    };
    collect("props", projection.state.props ?? [], (prop: Prop) =>
      instanceIds.has(prop.instanceId)
    );
    collect(
      "dataSources",
      projection.state.dataSources ?? [],
      (
        dataSource: NonNullable<BuilderState["dataSources"]> extends Map<
          string,
          infer Value
        >
          ? Value
          : never
      ) => instanceIds.has(dataSource.scopeInstanceId ?? "")
    );
    const transferredDataSourceIds = recordIds.get("dataSources") ?? new Set();
    const referencesTransferredDataSource = (expression: string) =>
      Array.from(getExpressionIdentifiers(expression)).some((identifier) => {
        const dataSourceId = decodeDataVariableId(identifier);
        return (
          dataSourceId !== undefined &&
          transferredDataSourceIds.has(dataSourceId)
        );
      });
    if (transferredDataSourceIds.size > 0) {
      for (const instance of projection.state.instances?.values() ?? []) {
        if (instanceIds.has(instance.id)) {
          continue;
        }
        if (
          instance.children.some(
            (child) =>
              child.type === "expression" &&
              referencesTransferredDataSource(child.value)
          )
        ) {
          return throwBuilderRuntimeError(
            "BAD_REQUEST",
            "A data source referenced outside the moved subtree cannot change storage ownership."
          );
        }
      }
      for (const prop of projection.state.props?.values() ?? []) {
        if (instanceIds.has(prop.instanceId)) {
          continue;
        }
        if (
          (prop.type === "parameter" &&
            transferredDataSourceIds.has(prop.value)) ||
          listPropExpressions(prop).some(({ expression }) =>
            referencesTransferredDataSource(expression)
          )
        ) {
          return throwBuilderRuntimeError(
            "BAD_REQUEST",
            "A data source referenced outside the moved subtree cannot change storage ownership."
          );
        }
      }
    }
    collect(
      "styleSourceSelections",
      projection.state.styleSourceSelections ?? [],
      (
        selection: NonNullable<
          BuilderState["styleSourceSelections"]
        > extends Map<string, infer Value>
          ? Value
          : never
      ) => instanceIds.has(selection.instanceId)
    );
    const localStyleSourceIds = new Set<string>();
    for (const instanceId of instanceIds) {
      for (const styleSourceId of projection.state.styleSourceSelections?.get(
        instanceId
      )?.values ?? []) {
        if (
          projection.state.styleSources?.get(styleSourceId)?.type === "local"
        ) {
          localStyleSourceIds.add(styleSourceId);
        }
      }
    }
    if (localStyleSourceIds.size > 0) {
      for (const selection of projection.state.styleSourceSelections?.values() ??
        []) {
        if (
          instanceIds.has(selection.instanceId) === false &&
          selection.values.some((id) => localStyleSourceIds.has(id))
        ) {
          return throwBuilderRuntimeError(
            "BAD_REQUEST",
            "A local style shared outside the moved subtree cannot change storage ownership."
          );
        }
      }
      recordIds.set("styleSources", localStyleSourceIds);
      recordIds.set(
        "styles",
        new Set(
          Array.from(projection.state.styles ?? [])
            .filter(([, style]) => localStyleSourceIds.has(style.styleSourceId))
            .map(([id]) => id)
        )
      );
    }
    const resourceIds = new Set<string>();
    for (const propId of recordIds.get("props") ?? []) {
      const prop = projection.state.props?.get(propId);
      if (prop?.type === "resource") {
        resourceIds.add(prop.value);
      }
    }
    for (const dataSourceId of recordIds.get("dataSources") ?? []) {
      const dataSource = projection.state.dataSources?.get(dataSourceId);
      if (dataSource?.type === "resource") {
        resourceIds.add(dataSource.resourceId);
      }
    }
    for (const resourceId of resourceIds) {
      const resourceRoot = getExistingRecordStorageRoot({
        identity: projection.externalRootByResourceId.get(resourceId),
        exists: projection.state.resources?.has(resourceId) === true,
      });
      if (isSameContentStorageRoot(resourceRoot, sourceRoot) === false) {
        resourceIds.delete(resourceId);
      }
    }
    if (transferredDataSourceIds.size > 0) {
      for (const resource of projection.state.resources?.values() ?? []) {
        if (resourceIds.has(resource.id)) {
          continue;
        }
        if (
          listResourceExpressions(resource).some(
            referencesTransferredDataSource
          )
        ) {
          return throwBuilderRuntimeError(
            "BAD_REQUEST",
            "A data source referenced outside the moved subtree cannot change storage ownership."
          );
        }
      }
    }
    if (resourceIds.size > 0) {
      for (const prop of projection.state.props?.values() ?? []) {
        if (
          instanceIds.has(prop.instanceId) === false &&
          prop.type === "resource" &&
          resourceIds.has(prop.value)
        ) {
          return throwBuilderRuntimeError(
            "BAD_REQUEST",
            "A resource shared outside the moved subtree cannot change storage ownership."
          );
        }
      }
      for (const dataSource of projection.state.dataSources?.values() ?? []) {
        if (
          instanceIds.has(dataSource.scopeInstanceId ?? "") === false &&
          dataSource.type === "resource" &&
          resourceIds.has(dataSource.resourceId)
        ) {
          return throwBuilderRuntimeError(
            "BAD_REQUEST",
            "A resource shared outside the moved subtree cannot change storage ownership."
          );
        }
      }
      recordIds.set("resources", resourceIds);
    }
    const movedReferenceError =
      "Moved content reference crosses an authored storage boundary.";
    for (const instance of afterState.instances?.values() ?? []) {
      if (instanceIds.has(instance.id)) {
        continue;
      }
      const referencesMovedInstance = instance.children.some(
        (child) => child.type === "id" && instanceIds.has(child.value)
      );
      if (referencesMovedInstance === false) {
        continue;
      }
      const instanceRoot = resolveContentStorageRoot(projection, {
        type: "instance",
        instanceId: instance.id,
      });
      if (isSameContentStorageRoot(instanceRoot, targetRoot) === false) {
        return throwBuilderRuntimeError("BAD_REQUEST", movedReferenceError);
      }
    }
    for (const prop of afterState.props?.values() ?? []) {
      if (
        instanceIds.has(prop.instanceId) ||
        prop.type !== "page" ||
        typeof prop.value !== "object" ||
        prop.value === null ||
        instanceIds.has(prop.value.instanceId) === false
      ) {
        continue;
      }
      validateExternalReferenceOwnership({
        root: resolveContentStorageRoot(projection, {
          type: "instance",
          instanceId: prop.instanceId,
        }),
        referenceRoot: targetRoot,
        error: movedReferenceError,
      });
    }
    for (const instanceId of instanceIds) {
      const instance = projection.state.instances?.get(instanceId);
      for (const child of instance?.children ?? []) {
        if (child.type === "expression") {
          validateExpressionReferenceOwnership({
            projection,
            root: targetRoot,
            expression: child.value,
            ownedDataSourceIds: transferredDataSourceIds,
            error: movedReferenceError,
          });
        }
      }
    }
    for (const propId of recordIds.get("props") ?? []) {
      const prop = projection.state.props?.get(propId);
      if (prop !== undefined) {
        validatePropReferenceOwnership({
          projection,
          root: targetRoot,
          prop,
          ownedInstanceIds: instanceIds,
          ownedDataSourceIds: transferredDataSourceIds,
          ownedResourceIds: resourceIds,
          error: movedReferenceError,
        });
      }
    }
    for (const resourceId of resourceIds) {
      const resource = projection.state.resources?.get(resourceId);
      if (resource === undefined) {
        continue;
      }
      for (const expression of listResourceExpressions(resource)) {
        validateExpressionReferenceOwnership({
          projection,
          root: targetRoot,
          expression,
          ownedDataSourceIds: transferredDataSourceIds,
          error: movedReferenceError,
        });
      }
    }
    for (const [namespace, ids] of recordIds) {
      const afterNamespace = afterState[namespace];
      if (!(afterNamespace instanceof Map)) {
        return throwBuilderRuntimeError(
          "BAD_REQUEST",
          `Transferred namespace "${namespace}" is missing.`
        );
      }
      for (const id of ids) {
        const value = afterNamespace.get(id);
        if (value === undefined) {
          return throwBuilderRuntimeError(
            "BAD_REQUEST",
            `Transferred ${namespace} record "${id}" is missing.`
          );
        }
        markTransferred(namespace, id);
        addPatch(targetRoot, namespace, { op: "add", path: [id], value });
        addPatch(sourceRoot, namespace, { op: "remove", path: [id] });
        for (const externalRoot of [sourceRoot, targetRoot]) {
          if (externalRoot.type !== "external") {
            continue;
          }
          const removedByNamespace =
            validationRemovedRecordIdsByBlockId.get(
              externalRoot.identity.blockInstanceId
            ) ?? new Map();
          const removedIds = removedByNamespace.get(namespace) ?? new Set();
          removedIds.add(id);
          removedByNamespace.set(namespace, removedIds);
          validationRemovedRecordIdsByBlockId.set(
            externalRoot.identity.blockInstanceId,
            removedByNamespace
          );
        }
        if (sourceRoot.type === "external") {
          const skippedByNamespace =
            validationSkippedRecordIdsByBlockId.get(
              sourceRoot.identity.blockInstanceId
            ) ?? new Map();
          const skippedIds = skippedByNamespace.get(namespace) ?? new Set();
          skippedIds.add(id);
          skippedByNamespace.set(namespace, skippedIds);
          validationSkippedRecordIdsByBlockId.set(
            sourceRoot.identity.blockInstanceId,
            skippedByNamespace
          );
        }
        if (targetRoot.type === "external" && namespace !== "instances") {
          const skippedByNamespace =
            validationSkippedRecordIdsByBlockId.get(
              targetRoot.identity.blockInstanceId
            ) ?? new Map();
          const skippedIds = skippedByNamespace.get(namespace) ?? new Set();
          skippedIds.add(id);
          skippedByNamespace.set(namespace, skippedIds);
          validationSkippedRecordIdsByBlockId.set(
            targetRoot.identity.blockInstanceId,
            skippedByNamespace
          );
        }
        if (targetRoot.type === "external" && namespace === "instances") {
          const incomingIds =
            incomingInstanceIdsByBlockId.get(
              targetRoot.identity.blockInstanceId
            ) ?? new Set();
          incomingIds.add(id);
          incomingInstanceIdsByBlockId.set(
            targetRoot.identity.blockInstanceId,
            incomingIds
          );
        }
      }
    }
  }
  for (const change of mutation.payload) {
    for (const patch of change.patches) {
      const [recordId] = patch.path;
      if (
        typeof recordId === "string" &&
        transferredRecordIds.get(change.namespace)?.has(recordId)
      ) {
        continue;
      }
      const root = getStructuralPatchRoot({ projection, change, patch });
      addPatch(root, change.namespace, patch);
    }
  }
  if (externalChanges.size > 0 && returnStorageChanges !== true) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "The caller must handle authored storage changes."
    );
  }
  const storageChanges = Array.from(externalChanges.values()).flatMap(
    ({ root, changes }) => {
      const removedByNamespace = validationRemovedRecordIdsByBlockId.get(
        root.identity.blockInstanceId
      );
      const validationState = { ...projection.state };
      if (removedByNamespace !== undefined) {
        for (const [namespace, ids] of removedByNamespace) {
          const namespaceState = projection.state[namespace];
          if (!(namespaceState instanceof Map)) {
            continue;
          }
          const values = new Map(
            namespaceState as ReadonlyMap<string, unknown>
          );
          for (const id of ids) {
            values.delete(id);
          }
          (validationState as Record<string, unknown>)[namespace] = values;
        }
      }
      const incomingInstanceIds = incomingInstanceIdsByBlockId.get(
        root.identity.blockInstanceId
      );
      if (incomingInstanceIds !== undefined && validationState.instances) {
        validationState.instances = new Map(
          Array.from(validationState.instances, ([id, instance]) => [
            id,
            incomingInstanceIds.has(id)
              ? instance
              : {
                  ...instance,
                  children: instance.children.filter(
                    (child) =>
                      child.type !== "id" ||
                      incomingInstanceIds.has(child.value) === false
                  ),
                },
          ])
        );
      }
      const storageChange = createExternalStorageChange({
        projection,
        root,
        payload: Array.from(changes.values()),
        transferredRecordIds,
        validationSkippedRecordIds:
          validationSkippedRecordIdsByBlockId.get(
            root.identity.blockInstanceId
          ) ?? new Map(),
        validationState,
      });
      return storageChange === undefined ? [] : [storageChange];
    }
  );
  const combinedStorageChanges = [
    ...(mutation.storageChanges ?? []),
    ...storageChanges,
  ];
  const result = {
    ...mutation,
    payload: Array.from(projectChanges.values()),
    storageChanges:
      combinedStorageChanges.length === 0 ? undefined : combinedStorageChanges,
    noop: projectChanges.size === 0 && combinedStorageChanges.length === 0,
  } as Mutation;
  return {
    ...result,
    persistenceOrder: getRuntimeMutationPersistenceOrder(result),
  };
};
