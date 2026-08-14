import {
  blockComponent,
  blockTemplateComponent,
  contentBlockSourceProp,
  getStyleDeclKey,
  parseContentBlockSourceProp,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import equal from "fast-deep-equal";
import type { BuilderRuntimeMutation } from "./mutation";
import type { BuilderPatchChange } from "../contracts/patch";
import type { ContentStoragePatchChange } from "./mutation";
import {
  getContentModeCapabilities,
  validateContentModeTransaction,
} from "./content-mode-permissions";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { throwBuilderRuntimeError } from "./errors";

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
}>;

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
  }

  return {
    state: projectedState,
    externalRootByBlockId,
    externalRootByInstanceId,
  };
};

const projectStorageRoot = { type: "project" } as const;

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
  execute: (state: BuilderState) => Mutation;
}): Mutation => {
  if (materializedRoots === undefined || materializedRoots.length === 0) {
    return execute(state);
  }
  const projection = createContentStorageProjection({
    state,
    materializedRoots,
  });
  const root = resolveContentStorageRoot(projection, target);
  if (root.type === "project") {
    return execute(state);
  }
  if (returnStorageChanges !== true) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "The caller must handle authored storage changes."
    );
  }

  const mutation = execute(projection.state);
  const { validationPayload, storagePayload } = prepareExternalMutationPayload({
    projection,
    root,
    payload: mutation.payload,
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
  const storageChanges =
    storagePayload.length === 0
      ? mutation.storageChanges
      : [...(mutation.storageChanges ?? []), { root, payload: storagePayload }];
  return {
    ...mutation,
    payload: [],
    storageChanges,
    noop: storageChanges?.some((change) => change.payload.length > 0) !== true,
  } as Mutation;
};
