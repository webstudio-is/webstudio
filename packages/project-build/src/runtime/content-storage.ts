import {
  blockComponent,
  blockTemplateComponent,
  contentBlockSourceProp,
  decodeDataVariableId,
  getStyleDeclKey,
  parseContentBlockSourceProp,
  prop as propSchema,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type Prop,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import { getExpressionIdentifiers } from "@webstudio-is/expression";
import type { BuilderState } from "../state/builder-state";
import equal from "fast-deep-equal";
import type { BuilderRuntimeMutation } from "./mutation";
import type { BuilderPatchChange } from "../contracts/patch";
import type {
  ContentStorageChange,
  ContentStoragePatchChange,
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

export type ContentStorageTarget =
  | Readonly<{ type: "instance"; instanceId: Instance["id"] }>
  | Readonly<{
      type: "children";
      parentInstanceId: Instance["id"];
    }>;

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
}: {
  state: BuilderState;
  identity: ContentBlockExternalContentIdentity;
}) => {
  const block = state.instances?.get(identity.blockInstanceId);
  if (block?.component !== blockComponent) {
    throw new Error(
      `Materialized content block "${identity.blockInstanceId}" is missing`
    );
  }
  if (state.props !== undefined) {
    const sourceProps = Array.from(state.props.values()).filter(
      (prop) =>
        prop.instanceId === block.id && prop.name === contentBlockSourceProp
    );
    const source =
      sourceProps.length === 1
        ? parseContentBlockSourceProp(sourceProps[0])
        : undefined;
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

export const createContentStorageProjection = ({
  state,
  materializedRoots,
}: {
  state: BuilderState;
  materializedRoots: readonly MaterializedContentRoot[];
}): ContentStorageProjection => {
  if (materializedRoots.length === 0) {
    return {
      state,
      externalRootByBlockId: new Map(),
      externalRootByInstanceId: new Map(),
      externalRootByDataSourceId: new Map(),
      externalRootByResourceId: new Map(),
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

  for (const { identity } of materializedRoots) {
    if (externalRootByBlockId.has(identity.blockInstanceId)) {
      throw new Error(
        `Content Block "${identity.blockInstanceId}" can project only one render scope`
      );
    }
    externalRootByBlockId.set(identity.blockInstanceId, identity);
  }

  const pendingRoots = [...materializedRoots];
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
    const block = assertExternalBlockStorage({
      state: projectedState,
      identity,
    });
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
    projectedState.instances.set(block.id, {
      ...block,
      children: [...block.children, ...fragment.children],
    });
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
  }

  return {
    state: projectedState,
    externalRootByBlockId,
    externalRootByInstanceId,
    externalRootByDataSourceId,
    externalRootByResourceId,
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
}: {
  projection: ContentStorageProjection;
  root: Extract<ContentStorageRoot, { type: "external" }>;
  payload: BuilderPatchChange[];
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
      if (
        change.namespace === "instances" &&
        typeof instanceId === "string" &&
        projection.state.instances?.has(instanceId)
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
        validationPatches.push(patch);
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
}: {
  projection: ContentStorageProjection;
  root: Extract<ContentStorageRoot, { type: "external" }>;
  payload: BuilderPatchChange[];
}) => {
  const { validationPayload, storagePayload } = prepareExternalMutationPayload({
    projection,
    root,
    payload,
  });
  const validation = validateContentModeTransaction({
    capabilities: getContentModeCapabilities({
      instances: projection.state.instances ?? new Map(),
      metas: componentMetas,
      props: projection.state.props ?? new Map(),
      styleSources: projection.state.styleSources ?? new Map(),
      styleSourceSelections:
        projection.state.styleSourceSelections ?? new Map(),
      styles: projection.state.styles ?? new Map(),
      breakpoints: projection.state.breakpoints,
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

export const executeContentStorageMutation = <
  Mutation extends BuilderRuntimeMutation,
>({
  state,
  materializedRoots,
  returnStorageChanges,
  target,
  execute,
}: {
  state: BuilderState;
  materializedRoots?: readonly MaterializedContentRoot[];
  returnStorageChanges?: boolean;
  target: ContentStorageTarget;
  execute: (state: BuilderState, root: ContentStorageRoot) => Mutation;
}): Mutation => {
  if (materializedRoots === undefined || materializedRoots.length === 0) {
    return execute(state, projectStorageRoot);
  }
  const projection = createContentStorageProjection({
    state,
    materializedRoots,
  });
  if (
    target.type === "instance" &&
    materializedRoots.some(({ identity }) =>
      projection.state.instances
        ?.get(identity.blockInstanceId)
        ?.children.some(
          (child) =>
            child.type === "id" &&
            child.value === target.instanceId &&
            projection.state.instances?.get(child.value)?.component ===
              blockTemplateComponent
        )
    )
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "The source-backed Content Block Templates list cannot be changed."
    );
  }
  const root = resolveContentStorageRoot(projection, target);
  if (root.type === "project") {
    return execute(state, root);
  }
  if (returnStorageChanges !== true) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "The caller must handle authored storage changes."
    );
  }

  const mutation = execute(projection.state, root);
  const storageChange = createExternalStorageChange({
    projection,
    root,
    payload: mutation.payload,
  });
  const storageChanges =
    storageChange === undefined
      ? mutation.storageChanges
      : [...(mutation.storageChanges ?? []), storageChange];
  return {
    ...mutation,
    payload: [],
    storageChanges,
    noop: storageChanges?.some((change) => change.payload.length > 0) !== true,
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

const validatePropReferenceOwnership = ({
  projection,
  root,
  prop,
}: {
  projection: ContentStorageProjection;
  root: ContentStorageRoot;
  prop: Prop;
}) => {
  const referenceRoots: ContentStorageRoot[] = [];
  if (prop.type === "parameter") {
    const identity = projection.externalRootByDataSourceId.get(prop.value);
    referenceRoots.push(
      identity === undefined
        ? projectStorageRoot
        : { type: "external", identity }
    );
  } else if (prop.type === "resource") {
    const identity = projection.externalRootByResourceId.get(prop.value);
    referenceRoots.push(
      identity === undefined
        ? projectStorageRoot
        : { type: "external", identity }
    );
  } else if (
    prop.type === "page" &&
    typeof prop.value === "object" &&
    prop.value !== null
  ) {
    referenceRoots.push(
      resolveContentStorageRoot(projection, {
        type: "instance",
        instanceId: prop.value.instanceId,
      })
    );
  }
  for (const { expression } of listPropExpressions(prop)) {
    for (const identifier of getExpressionIdentifiers(expression)) {
      const dataSourceId = decodeDataVariableId(identifier);
      if (dataSourceId === undefined) {
        continue;
      }
      const identity = projection.externalRootByDataSourceId.get(dataSourceId);
      referenceRoots.push(
        identity === undefined
          ? projectStorageRoot
          : { type: "external", identity }
      );
    }
  }
  for (const referenceRoot of referenceRoots) {
    if (
      referenceRoot.type === "external" &&
      isSameContentStorageRoot(root, referenceRoot) === false
    ) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Prop reference crosses an authored storage boundary."
      );
    }
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
