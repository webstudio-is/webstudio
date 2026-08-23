import { atom, computed } from "nanostores";
import hash from "@emotion/hash";
import { toast } from "@webstudio-is/design-system";
import type { MdxAuthoredNode } from "@webstudio-is/content-engine/mdx";
import {
  createContentStorageSelectorProjection,
  applyMdxContentStorageChanges,
  executeContentBlockPersistencePlan,
  findBlockSelector,
  findAllNavigableTextInstanceSelectors,
  getContentBlockSessionMessage,
  getContentBlockRenderScopeKey,
  getContentStorageChangeRoots,
  getContentStorageIdentityKey,
  type ContentStorageChange,
  type ContentStorageRoot,
  type ContentBlockPersistenceResult,
  type InstanceSelector,
  type MaterializedContentRoot,
  type MaterializedMdxAuthoredContentRoot,
  type MdxAssetEditingSessionState,
} from "@webstudio-is/project-build/runtime";
import type {
  Asset,
  Breakpoint,
  ContentBlockDiagnostic,
  ContentBlockExternalContentIdentity,
  DataSource,
  GetChildInstanceSelectors,
  GetInstanceChildren,
  Instance,
  Instances,
  Prop,
  Props,
  Resource,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  blockComponent,
  blockTemplateComponent,
  collectionComponent,
  findTreeInstanceIds,
  getContentBlockSource,
  getIndexesWithinAncestors,
  ROOT_INSTANCE_ID,
} from "@webstudio-is/sdk";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $project,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
  readBuilderStateStores,
} from "./sync/data-stores";

type StorageSaveResult =
  | Readonly<{
      status: "applied";
      persistence?: ContentBlockPersistenceResult;
    }>
  | Readonly<{
      status: "blocked" | "partial";
      message: string;
      persistence?: ContentBlockPersistenceResult;
    }>;

type StorageSaver = (
  changes: readonly ContentStorageChange[],
  loadedRoots: readonly MaterializedMdxAuthoredContentRoot[]
) => Promise<StorageSaveResult>;

type StorageSaverEntry = {
  preflight: StorageSaver;
  save: StorageSaver;
  isCurrent: (root: MaterializedContentRoot) => boolean;
};

export type MaterializedContentViewState = Readonly<{
  status:
    | "loading"
    | "ready"
    | "empty"
    | "pending"
    | "failed"
    | "recoverable"
    | "conflicting"
    | "cancelled";
  diagnostics: readonly ContentBlockDiagnostic[];
  identity?: ContentBlockExternalContentIdentity;
  assetId?: Asset["id"];
  message?: string;
  hasUnsavedSource?: boolean;
}>;

export const contentBlockPresentationComponent = "ws:content-presentation";

export type ContentBlockPresentationItem = Readonly<{
  id: Instance["id"];
  blockInstanceId: Instance["id"];
  renderScope: string;
  label: string;
  message: string;
  diagnostic?: ContentBlockDiagnostic;
}>;

export const $materializedContentRoots = atom<
  ReadonlyMap<string, MaterializedContentRoot>
>(new Map());
export const $materializedContentViewStates = atom<
  ReadonlyMap<string, MaterializedContentViewState>
>(new Map());
const $switchingContentScopes = atom<ReadonlySet<string>>(new Set());
export const $materializedContentStatuses = computed(
  [$materializedContentViewStates, $switchingContentScopes],
  (states, switchingScopes) =>
    new Map(
      Array.from(states, ([key, state]) => [
        key,
        switchingScopes.has(key)
          ? ("loading" as const)
          : state.status === "ready" || state.status === "empty"
            ? ("ready" as const)
            : state.status === "loading" || state.status === "pending"
              ? ("loading" as const)
              : ("failed" as const),
      ])
    )
);

export const $activeMaterializedContentRoots = computed(
  [$materializedContentRoots, $instances, $props],
  (materializedRoots, instances, props) => {
    const attachedBlocks = new Map<string, boolean>();
    return new Map(
      Array.from(materializedRoots).filter(([, { identity }]) => {
        const cached = attachedBlocks.get(identity.blockInstanceId);
        if (cached !== undefined) {
          return cached;
        }
        const block = instances.get(identity.blockInstanceId);
        if (block === undefined) {
          attachedBlocks.set(identity.blockInstanceId, false);
          return false;
        }
        if (
          getContentBlockSource({
            blockInstanceId: block.id,
            props: props.values(),
          }) === undefined
        ) {
          attachedBlocks.set(identity.blockInstanceId, false);
          return false;
        }
        const templateChildren = block.children.filter(
          (child) =>
            child.type === "id" &&
            instances.get(child.value)?.component === blockTemplateComponent
        );
        const isAttached =
          templateChildren.length === 1 &&
          templateChildren.length === block.children.length;
        attachedBlocks.set(identity.blockInstanceId, isAttached);
        return isAttached;
      })
    );
  }
);

const formatSourceLocation = (diagnostic: ContentBlockDiagnostic) => {
  const point = diagnostic.sourceRange?.start;
  return point === undefined
    ? ""
    : ` Line ${point.line}, column ${point.column}.`;
};

export const formatContentBlockDiagnostic = (
  diagnostic: ContentBlockDiagnostic
) => {
  let message: string;
  if (diagnostic.code === "invalid-mdx") {
    message = diagnostic.message;
  } else if (diagnostic.code === "unsafe-mdx") {
    message = diagnostic.reason;
  } else if (diagnostic.code === "unresolved-template") {
    message = `Template "${diagnostic.templateName}" is not available and was skipped.`;
  } else if (diagnostic.code === "ignored-template-prop") {
    message = `Property "${diagnostic.propName}" on template "${
      diagnostic.templateName
    }" was ignored because it is ${diagnostic.reason.replace("-", " ")}.`;
  } else if (diagnostic.code === "stale-revision") {
    message = "The MDX file changed after it was loaded.";
  } else if (diagnostic.code === "changed-binding") {
    message = "The dynamic content source resolved to a different MDX file.";
  } else if (diagnostic.code === "pending-writes") {
    message = `${diagnostic.pendingMutationCount} MDX ${
      diagnostic.pendingMutationCount === 1 ? "change is" : "changes are"
    } still pending.`;
  } else if (diagnostic.code === "authorization-failed") {
    message = `The MDX file could not be ${
      diagnostic.operation === "read" ? "opened" : "saved"
    } with the current permissions.`;
  } else {
    message = "Some MDX changes could not be saved. Reload the Builder.";
  }
  return `${message}${formatSourceLocation(diagnostic)}`;
};

const notifiedDiagnosticKeys = new Set<string>();
const notifiedStateKeys = new Set<string>();

export const deduplicateContentBlockDiagnostics = (
  diagnostics: readonly ContentBlockDiagnostic[]
) => {
  const keys = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = JSON.stringify(diagnostic);
    if (keys.has(key)) {
      return false;
    }
    keys.add(key);
    return true;
  });
};

export const takeNewContentBlockDiagnostics = (
  diagnostics: readonly ContentBlockDiagnostic[],
  revision?: string
) => {
  const fresh: ContentBlockDiagnostic[] = [];
  for (const diagnostic of deduplicateContentBlockDiagnostics(diagnostics)) {
    const key = JSON.stringify([revision, diagnostic]);
    if (notifiedDiagnosticKeys.has(key)) {
      continue;
    }
    notifiedDiagnosticKeys.add(key);
    fresh.push(diagnostic);
  }
  return fresh;
};

const getSessionMessage = (state: MdxAssetEditingSessionState) => {
  if (state.status === "conflicting") {
    return getContentBlockSessionMessage(state);
  }
  if (state.status === "recoverable") {
    return "The MDX file could not be rendered. Open the file to repair it, then retry.";
  }
  if (state.status === "cancelled") {
    return "MDX editing was cancelled.";
  }
  if (state.status === "failed") {
    return "The MDX file could not be loaded or saved.";
  }
};

export const getMaterializedContentViewStateFromSession = (
  state: MdxAssetEditingSessionState
): MaterializedContentViewState => {
  const identity = "identity" in state ? state.identity : undefined;
  const diagnostics = state.diagnostics;
  if (state.status === "saved") {
    return {
      status: state.root.fragment.children.length === 0 ? "empty" : "ready",
      identity,
      assetId: identity?.assetId,
      diagnostics,
    };
  }
  if (state.status === "pending") {
    return {
      status: "pending",
      identity,
      assetId: identity?.assetId,
      diagnostics,
      hasUnsavedSource: true,
      message: "Saving MDX content…",
    };
  }
  return {
    status: state.status,
    identity,
    assetId: identity?.assetId,
    diagnostics,
    hasUnsavedSource: "localSource" in state,
    message: getSessionMessage(state),
  };
};

const $contentStorageBaseProjection = computed(
  [
    $activeMaterializedContentRoots,
    $assets,
    $breakpoints,
    $dataSources,
    $instances,
    $props,
    $resources,
    $styleSourceSelections,
    $styleSources,
    $styles,
  ],
  (materializedRoots) => {
    const state = readBuilderStateStores();
    return createContentStorageSelectorProjection({
      state,
      materializedRoots: Array.from(materializedRoots.values()),
      allowStaleSource: true,
    });
  }
);

export const isAuthoredRoot = (
  root: MaterializedContentRoot
): root is MaterializedMdxAuthoredContentRoot =>
  "provenance" in root && "document" in root;

const createPresentationItem = ({
  blockInstanceId,
  renderScope,
  label,
  message,
  diagnostic,
  discriminator,
}: Omit<ContentBlockPresentationItem, "id"> & {
  discriminator: unknown;
}): ContentBlockPresentationItem => ({
  id: `mdx-builder-${hash(
    JSON.stringify([blockInstanceId, renderScope, discriminator])
  )}`,
  blockInstanceId,
  renderScope,
  label,
  message,
  diagnostic,
});

const getAuthoredChildren = (
  root: MaterializedMdxAuthoredContentRoot,
  parentPath: readonly number[]
): readonly MdxAuthoredNode[] | undefined => {
  let children = root.document.children;
  for (const index of parentPath) {
    const node = children[index];
    if (
      node === undefined ||
      (node.type !== "element" && node.type !== "template")
    ) {
      return;
    }
    children = node.children;
  }
  return children;
};

const getPathKey = (path: readonly number[]) => path.join(".");

const $contentStorageProjection = computed(
  [
    $contentStorageBaseProjection,
    $activeMaterializedContentRoots,
    $materializedContentViewStates,
  ],
  (projection, materializedRoots, viewStates) => {
    const instances = new Map(projection.state.instances);
    const items = new Map<Instance["id"], ContentBlockPresentationItem>();
    const reservedInstanceIds = new Set(instances.keys());
    const createItem = (
      input: Parameters<typeof createPresentationItem>[0]
    ): ContentBlockPresentationItem => {
      const item = createPresentationItem(input);
      let id = item.id;
      let collisionIndex = 0;
      while (reservedInstanceIds.has(id)) {
        collisionIndex += 1;
        id = `${item.id}-${collisionIndex}`;
      }
      reservedInstanceIds.add(id);
      return id === item.id ? item : { ...item, id };
    };
    const childrenByScope = new Map<string, Instance["children"]>();
    for (const [scopeKey, viewState] of viewStates) {
      const root = materializedRoots.get(scopeKey);
      const parsedScope = JSON.parse(scopeKey) as [string, string];
      const [blockInstanceId, renderScope] = parsedScope;
      if (
        instances.has(blockInstanceId) === false ||
        getContentBlockSource({
          blockInstanceId,
          props: projection.state.props?.values() ?? [],
        }) === undefined
      ) {
        continue;
      }
      const fallbackWarningItems: ContentBlockPresentationItem[] = [];
      const unresolvedDiagnostics = viewState.diagnostics.filter(
        (diagnostic) => diagnostic.code === "unresolved-template"
      );
      const diagnosticsByTemplate = new Map<
        string,
        Extract<ContentBlockDiagnostic, { code: "unresolved-template" }>[]
      >();
      for (const diagnostic of unresolvedDiagnostics) {
        const diagnostics = diagnosticsByTemplate.get(diagnostic.templateName);
        if (diagnostics === undefined) {
          diagnosticsByTemplate.set(diagnostic.templateName, [diagnostic]);
        } else {
          diagnostics.push(diagnostic);
        }
      }
      const warningItemsByParent = new Map<
        Instance["id"],
        Map<number, ContentBlockPresentationItem>
      >();
      if (root !== undefined && isAuthoredRoot(root)) {
        const authoredInstanceByPath = new Map(
          root.provenance.nodes.map((node) => [getPathKey(node.path), node])
        );
        for (const marker of root.provenance.unresolvedTemplates) {
          const diagnostic = diagnosticsByTemplate
            .get(marker.templateName)
            ?.shift();
          if (diagnostic === undefined) {
            continue;
          }
          const item = createItem({
            blockInstanceId,
            renderScope,
            label: `Missing template: ${diagnostic.templateName}`,
            message: formatContentBlockDiagnostic(diagnostic),
            diagnostic,
            discriminator: marker.markerId,
          });
          const parentPath = marker.path.slice(0, -1);
          const parentNode = authoredInstanceByPath.get(getPathKey(parentPath));
          if (parentPath.length > 0 && parentNode?.type !== "element") {
            fallbackWarningItems.push(item);
            continue;
          }
          const parentId =
            parentNode?.type === "element"
              ? parentNode.instanceId
              : blockInstanceId;
          const warningItems =
            warningItemsByParent.get(parentId) ??
            new Map<number, ContentBlockPresentationItem>();
          warningItems.set(marker.path.at(-1) ?? 0, item);
          warningItemsByParent.set(parentId, warningItems);
        }
      }
      for (const diagnostics of diagnosticsByTemplate.values()) {
        for (const diagnostic of diagnostics) {
          const item = createItem({
            blockInstanceId,
            renderScope,
            label: `Missing template: ${diagnostic.templateName}`,
            message: formatContentBlockDiagnostic(diagnostic),
            diagnostic,
            discriminator: diagnostic,
          });
          fallbackWarningItems.push(item);
        }
      }
      const presentationItems = [
        ...fallbackWarningItems,
        ...Array.from(warningItemsByParent.values()).flatMap((warningItems) =>
          Array.from(warningItems.values())
        ),
      ];
      if (presentationItems.length === 0) {
        continue;
      }
      for (const item of presentationItems) {
        if (instances.has(item.id)) {
          throw new Error(`Builder MDX presentation id "${item.id}" collides`);
        }
        items.set(item.id, item);
        instances.set(item.id, {
          type: "instance",
          id: item.id,
          component: contentBlockPresentationComponent,
          label: item.label,
          children: [],
        });
      }
      if (root !== undefined && isAuthoredRoot(root)) {
        const resolvedPathKeys = new Set(
          root.provenance.nodes.map((node) => getPathKey(node.path))
        );
        for (const [parentId, warningItems] of warningItemsByParent) {
          const parentPath =
            parentId === blockInstanceId
              ? []
              : (root.provenance.nodes.find(
                  (node) => node.instanceId === parentId
                )?.path ?? []);
          const authoredChildren = getAuthoredChildren(root, parentPath);
          const parent = instances.get(parentId);
          if (authoredChildren === undefined || parent === undefined) {
            continue;
          }
          const projectedChildren = projection.getInstanceChildren(
            parent,
            renderScope
          );
          const projectOwnedChildren =
            parentId === blockInstanceId ? parent.children : [];
          const materializedChildren = projectedChildren.slice(
            projectOwnedChildren.length
          );
          let materializedIndex = 0;
          const authoredProjectedChildren: Instance["children"] = [];
          authoredChildren.forEach((node, index) => {
            const warningItem = warningItems.get(index);
            if (warningItem !== undefined) {
              authoredProjectedChildren.push({
                type: "id",
                value: warningItem.id,
              });
              return;
            }
            if (node.type === "comment") {
              return;
            }
            const nodePathKey = getPathKey([...parentPath, index]);
            if (
              node.type === "template" &&
              resolvedPathKeys.has(nodePathKey) === false
            ) {
              return;
            }
            const child = materializedChildren[materializedIndex];
            if (child !== undefined) {
              authoredProjectedChildren.push(child);
              materializedIndex += 1;
            }
          });
          authoredProjectedChildren.push(
            ...materializedChildren.slice(materializedIndex)
          );
          childrenByScope.set(
            getContentBlockRenderScopeKey(parentId, renderScope),
            [...projectOwnedChildren, ...authoredProjectedChildren]
          );
        }
      }
      if (fallbackWarningItems.length > 0) {
        const blockChildrenKey = getContentBlockRenderScopeKey(
          blockInstanceId,
          renderScope
        );
        const block = instances.get(blockInstanceId) as Instance;
        const blockChildren =
          childrenByScope.get(blockChildrenKey) ??
          projection.getInstanceChildren(block, renderScope);
        childrenByScope.set(blockChildrenKey, [
          ...blockChildren,
          ...fallbackWarningItems.map(({ id }) => ({
            type: "id" as const,
            value: id,
          })),
        ]);
      }
    }
    return {
      state: { ...projection.state, instances },
      items,
      getInstanceChildren: (instance: Instance, renderScope: string) =>
        childrenByScope.get(
          getContentBlockRenderScopeKey(instance.id, renderScope)
        ) ?? projection.getInstanceChildren(instance, renderScope),
    };
  }
);

export const $contentBlockPresentationItems = computed(
  $contentStorageProjection,
  ({ items }) => items
);

export const $runtimeInstances = computed(
  $contentStorageProjection,
  ({ state }) => state.instances ?? new Map<Instance["id"], Instance>()
);
export const $runtimeProps = computed(
  $contentStorageProjection,
  ({ state }) => state.props ?? new Map<Prop["id"], Prop>()
);
export const $runtimeAssets = computed(
  $contentStorageProjection,
  ({ state }) => state.assets ?? new Map<Asset["id"], Asset>()
);
export const $runtimeDataSources = computed(
  $contentStorageProjection,
  ({ state }) => state.dataSources ?? new Map<DataSource["id"], DataSource>()
);
export const $runtimeBreakpoints = computed(
  $contentStorageProjection,
  ({ state }) => state.breakpoints ?? new Map<Breakpoint["id"], Breakpoint>()
);
export const $runtimeResources = computed(
  $contentStorageProjection,
  ({ state }) => state.resources ?? new Map<Resource["id"], Resource>()
);
export const $runtimeStyleSources = computed(
  $contentStorageProjection,
  ({ state }) => state.styleSources ?? new Map<StyleSource["id"], StyleSource>()
);
export const $runtimeStyleSourceSelections = computed(
  $contentStorageProjection,
  ({ state }) =>
    state.styleSourceSelections ??
    new Map<StyleSourceSelection["instanceId"], StyleSourceSelection>()
);
export const $runtimeStyles = computed(
  $contentStorageProjection,
  ({ state }) => state.styles ?? new Map<string, StyleDecl>()
);

const getRenderScope = (instanceSelector: InstanceSelector) => {
  const renderScopeSelector =
    instanceSelector.at(-1) === ROOT_INSTANCE_ID
      ? instanceSelector.slice(0, -1)
      : instanceSelector;
  return JSON.stringify(renderScopeSelector);
};

const parseRenderScope = (renderScope: string) => {
  try {
    const value: unknown = JSON.parse(renderScope);
    if (
      Array.isArray(value) &&
      value.every((instanceId) => typeof instanceId === "string")
    ) {
      return value as InstanceSelector;
    }
  } catch {
    return;
  }
};

export const getRuntimeInstanceChildren = (
  instance: Instance,
  instanceSelector: InstanceSelector
) => {
  return $contentStorageProjection
    .get()
    .getInstanceChildren(instance, getRenderScope(instanceSelector));
};

type GetCollectionItemSelectors = (
  collectionSelector: InstanceSelector
) => InstanceSelector[];

const createRuntimeChildInstanceSelectorResolver =
  ({
    getCollectionItemSelectors,
    getInstanceChildren = getRuntimeInstanceChildren,
  }: {
    getCollectionItemSelectors: GetCollectionItemSelectors;
    getInstanceChildren?: GetInstanceChildren;
  }): GetChildInstanceSelectors =>
  (instance, instanceSelector) => {
    const parentSelectors =
      instance.component === collectionComponent
        ? getCollectionItemSelectors(instanceSelector)
        : [instanceSelector];
    return parentSelectors.flatMap((parentSelector) =>
      getInstanceChildren(instance, parentSelector).flatMap((child) =>
        child.type === "id" ? [[child.value, ...parentSelector]] : []
      )
    );
  };

export const getRuntimeIndexesWithinAncestors = ({
  metas,
  instances,
  rootIds,
  materializedRoots,
  getCollectionItemSelectors,
}: {
  metas: Map<Instance["component"], WsComponentMeta>;
  instances: Instances;
  rootIds: Instance["id"][];
  materializedRoots: Iterable<MaterializedContentRoot>;
  getCollectionItemSelectors: GetCollectionItemSelectors;
}) => {
  const roots = Array.from(materializedRoots);
  const rootsByScope = new Map(
    roots.map((root) => [
      getContentBlockRenderScopeKey(
        root.identity.blockInstanceId,
        root.identity.renderScope
      ),
      root,
    ])
  );
  return getIndexesWithinAncestors(
    metas,
    instances,
    rootIds,
    getRuntimeInstanceChildren,
    createRuntimeChildInstanceSelectorResolver({
      getCollectionItemSelectors,
      getInstanceChildren: (instance, instanceSelector) => {
        const renderScope = getRenderScope(instanceSelector);
        return (
          rootsByScope.get(
            getContentBlockRenderScopeKey(instance.id, renderScope)
          )?.fragment.children ??
          getRuntimeInstanceChildren(instance, instanceSelector)
        );
      },
    })
  );
};

export const getRuntimeAuthoredInstanceChildren = (
  instance: Instance,
  instanceSelector: InstanceSelector
) => {
  const children = getRuntimeInstanceChildren(instance, instanceSelector);
  if (
    instance.component !== blockComponent ||
    $activeMaterializedContentRoots
      .get()
      .has(
        getContentBlockRenderScopeKey(
          instance.id,
          getRenderScope(instanceSelector)
        )
      ) === false
  ) {
    return children;
  }
  return children.slice(instance.children.length);
};

export const findRuntimeTreeInstanceIds = (
  rootInstanceId: Instance["id"],
  instances: Instances = $runtimeInstances.get()
) => {
  const instanceIds = findTreeInstanceIds(instances, rootInstanceId);
  for (const root of $activeMaterializedContentRoots.get().values()) {
    const renderScope = parseRenderScope(root.identity.renderScope);
    if (
      renderScope === undefined ||
      renderScope.includes(rootInstanceId) === false
    ) {
      continue;
    }
    for (const instance of root.fragment.instances) {
      instanceIds.add(instance.id);
    }
  }
  return instanceIds;
};

export const findRuntimeNavigableTextInstanceSelectors = ({
  rootInstanceId,
  instances = $runtimeInstances.get(),
  props = $runtimeProps.get(),
  metas,
  getCollectionItemSelectors,
}: {
  rootInstanceId: Instance["id"];
  instances?: Instances;
  props?: Props;
  metas: Map<Instance["component"], WsComponentMeta>;
  getCollectionItemSelectors: GetCollectionItemSelectors;
}) => {
  const selectors = findAllNavigableTextInstanceSelectors({
    instanceSelector: [rootInstanceId],
    instances,
    props,
    metas,
    getChildInstanceSelectors: createRuntimeChildInstanceSelectorResolver({
      getCollectionItemSelectors,
    }),
  });
  const selectorKeys = new Set(
    selectors.map((selector) => getRenderScope(selector))
  );

  // A collection item selector is synthetic and cannot be traversed directly.
  // Include its materialized roots when callers scope navigation to one item.
  for (const root of $activeMaterializedContentRoots.get().values()) {
    const renderScope = parseRenderScope(root.identity.renderScope);
    if (
      renderScope === undefined ||
      renderScope.includes(rootInstanceId) === false
    ) {
      continue;
    }
    for (const child of root.fragment.children) {
      if (child.type !== "id") {
        continue;
      }
      for (const selector of findAllNavigableTextInstanceSelectors({
        instanceSelector: [child.value, ...renderScope],
        instances,
        props,
        metas,
        getInstanceChildren: getRuntimeInstanceChildren,
      })) {
        const key = getRenderScope(selector);
        if (selectorKeys.has(key)) {
          continue;
        }
        selectorKeys.add(key);
        selectors.push(selector);
      }
    }
  }
  return selectors;
};

export const getMaterializedContentStatus = ({
  blockInstanceId,
  renderScope,
}: {
  blockInstanceId: string;
  renderScope: string;
}) =>
  $materializedContentViewStates
    .get()
    .get(getContentBlockRenderScopeKey(blockInstanceId, renderScope))?.status;

export const getMaterializedContentViewState = ({
  blockInstanceId,
  renderScope,
}: {
  blockInstanceId: string;
  renderScope: string;
}) =>
  $materializedContentViewStates
    .get()
    .get(getContentBlockRenderScopeKey(blockInstanceId, renderScope));

const getMaterializedContentForSelector = (
  instanceSelector: InstanceSelector,
  instances: Instances
) => {
  const blockSelector = findBlockSelector({
    anchor: instanceSelector,
    instances,
  });
  if (blockSelector === undefined) {
    return;
  }
  return $activeMaterializedContentRoots
    .get()
    .get(
      getContentBlockRenderScopeKey(
        blockSelector[0],
        JSON.stringify(blockSelector)
      )
    );
};

export const getMaterializedContentForSelectors = (
  instanceSelectors: readonly InstanceSelector[],
  instances: Instances = $runtimeInstances.get()
) => {
  const selectedRoots = new Map<string, MaterializedContentRoot>();
  for (const instanceSelector of instanceSelectors) {
    const root = getMaterializedContentForSelector(instanceSelector, instances);
    if (root !== undefined) {
      selectedRoots.set(
        getContentBlockRenderScopeKey(
          root.identity.blockInstanceId,
          root.identity.renderScope
        ),
        root
      );
    }
  }
  return [...selectedRoots.values()];
};

export const getMaterializedInstanceEditability = ({
  instanceSelector,
  instances,
}: {
  instanceSelector: InstanceSelector;
  instances: Instances;
}) => {
  if ($contentBlockPresentationItems.get().has(instanceSelector[0])) {
    return false;
  }
  const root = getMaterializedContentForSelector(instanceSelector, instances);
  if (
    root === undefined ||
    root.fragment.instances.some(({ id }) => id === instanceSelector[0]) ===
      false
  ) {
    return;
  }
  if (
    isAuthoredRoot(root) &&
    root.provenance.nodes.some(
      (node) =>
        node.type === "template" &&
        node.instanceId !== instanceSelector[0] &&
        node.expandedInstanceIds.includes(instanceSelector[0])
    )
  ) {
    return false;
  }
  const scopeKey = getContentBlockRenderScopeKey(
    root.identity.blockInstanceId,
    root.identity.renderScope
  );
  if ($switchingContentScopes.get().has(scopeKey)) {
    return false;
  }
  const status = getMaterializedContentStatus({
    blockInstanceId: root.identity.blockInstanceId,
    renderScope: root.identity.renderScope,
  });
  return status === "ready" || status === "empty" || status === "pending";
};

export const setContentBlockSourceSwitching = ({
  blockInstanceId,
  renderScope,
  switching,
}: {
  blockInstanceId: string;
  renderScope: string;
  switching: boolean;
}) => {
  const key = getContentBlockRenderScopeKey(blockInstanceId, renderScope);
  const scopes = new Set($switchingContentScopes.get());
  if (switching) {
    scopes.add(key);
  } else {
    scopes.delete(key);
  }
  $switchingContentScopes.set(scopes);
};

export const isMaterializedInstanceEditable = (input: {
  instanceSelector: InstanceSelector;
  instances: Instances;
}) => getMaterializedInstanceEditability(input) ?? true;

const storageSavers = new Map<string, StorageSaverEntry>();

export const publishMaterializedContentRoot = (
  root: MaterializedContentRoot,
  diagnostics: readonly ContentBlockDiagnostic[] = []
) => {
  const roots = new Map($materializedContentRoots.get());
  const scopeKey = getContentBlockRenderScopeKey(
    root.identity.blockInstanceId,
    root.identity.renderScope
  );
  roots.set(scopeKey, root);
  $materializedContentRoots.set(roots);
  const states = new Map($materializedContentViewStates.get());
  states.set(scopeKey, {
    status: root.fragment.children.length === 0 ? "empty" : "ready",
    identity: root.identity,
    diagnostics,
  });
  $materializedContentViewStates.set(states);
};

export const setMaterializedContentStatus = ({
  blockInstanceId,
  renderScope,
  status,
  assetId,
}: {
  blockInstanceId: string;
  renderScope: string;
  status: "loading" | "failed";
  assetId?: Asset["id"];
}) => {
  const states = new Map($materializedContentViewStates.get());
  const key = getContentBlockRenderScopeKey(blockInstanceId, renderScope);
  const current = states.get(key);
  const sourceChanged =
    assetId !== undefined &&
    current?.identity !== undefined &&
    current.identity.assetId !== assetId;
  states.set(key, {
    status,
    identity: sourceChanged ? undefined : current?.identity,
    assetId: assetId ?? current?.assetId,
    diagnostics: sourceChanged ? [] : (current?.diagnostics ?? []),
    message:
      status === "failed"
        ? "The connected MDX file could not be loaded."
        : undefined,
  });
  $materializedContentViewStates.set(states);
};

export const publishMaterializedContentSessionState = ({
  blockInstanceId,
  renderScope,
  state,
}: {
  blockInstanceId: string;
  renderScope: string;
  state: MdxAssetEditingSessionState;
}) => {
  const revision = "identity" in state ? state.identity.revision : undefined;
  for (const diagnostic of takeNewContentBlockDiagnostics(
    state.diagnostics,
    revision
  )) {
    const filename =
      diagnostic.contentRef ??
      (diagnostic.assetId === undefined
        ? undefined
        : $assets.get().get(diagnostic.assetId)?.name) ??
      "MDX file";
    const message = `${filename}: ${formatContentBlockDiagnostic(
      diagnostic
    )} Render scope: ${diagnostic.renderScope ?? renderScope}.`;
    if (diagnostic.severity === "error") {
      toast.error(message);
    } else {
      toast.warn(message);
    }
  }
  if (
    state.diagnostics.length === 0 &&
    (state.status === "failed" ||
      state.status === "recoverable" ||
      state.status === "conflicting")
  ) {
    const viewState = getMaterializedContentViewStateFromSession(state);
    const key = JSON.stringify([
      state.status,
      revision,
      blockInstanceId,
      renderScope,
      viewState.message,
    ]);
    if (notifiedStateKeys.has(key) === false) {
      notifiedStateKeys.add(key);
      toast.error(
        `${
          viewState.message ?? "The MDX file is unavailable."
        } Render scope: ${renderScope}.`
      );
    }
  }
  if (state.status === "saved") {
    publishMaterializedContentRoot(state.root, state.diagnostics);
    return;
  }
  if ("root" in state) {
    const roots = new Map($materializedContentRoots.get());
    roots.set(
      getContentBlockRenderScopeKey(blockInstanceId, renderScope),
      state.root
    );
    $materializedContentRoots.set(roots);
  }
  const states = new Map($materializedContentViewStates.get());
  states.set(
    getContentBlockRenderScopeKey(blockInstanceId, renderScope),
    getMaterializedContentViewStateFromSession(state)
  );
  $materializedContentViewStates.set(states);
};

export const applyMaterializedContentChanges = (
  root: MaterializedContentRoot | undefined,
  changes: readonly ContentStorageChange[]
) => {
  if (root === undefined || isAuthoredRoot(root) === false) {
    throw new Error("The MDX authored content is not loaded.");
  }
  return {
    ...root,
    fragment: applyMdxContentStorageChanges({ root, changes }),
  };
};

export const publishPendingMaterializedContentChanges = (
  changes: readonly ContentStorageChange[]
) => {
  const changesByScope = new Map<string, ContentStorageChange[]>();
  for (const change of changes) {
    const scopeKey = getContentBlockRenderScopeKey(
      change.root.identity.blockInstanceId,
      change.root.identity.renderScope
    );
    const scopeChanges = changesByScope.get(scopeKey) ?? [];
    scopeChanges.push(change);
    changesByScope.set(scopeKey, scopeChanges);
  }
  for (const [scopeKey, scopeChanges] of changesByScope) {
    const root = $activeMaterializedContentRoots.get().get(scopeKey);
    const updatedRoot = applyMaterializedContentChanges(root, scopeChanges);
    const roots = new Map($materializedContentRoots.get());
    roots.set(scopeKey, updatedRoot);
    $materializedContentRoots.set(roots);
    const states = new Map($materializedContentViewStates.get());
    const current = states.get(scopeKey);
    states.set(scopeKey, {
      status: "pending",
      identity: updatedRoot.identity,
      assetId: updatedRoot.identity.assetId,
      diagnostics: current?.diagnostics ?? [],
      hasUnsavedSource: true,
      message: "Saving MDX content…",
    });
    $materializedContentViewStates.set(states);
  }
};

export const failPendingMaterializedContentChanges = (
  changes: readonly ContentStorageChange[],
  message: string,
  { includeReady = false }: { includeReady?: boolean } = {}
) => {
  const states = new Map($materializedContentViewStates.get());
  let changed = false;
  for (const change of changes) {
    const scopeKey = getContentBlockRenderScopeKey(
      change.root.identity.blockInstanceId,
      change.root.identity.renderScope
    );
    const current = states.get(scopeKey);
    const canFail =
      current?.status === "pending" ||
      (includeReady &&
        (current?.status === "ready" || current?.status === "empty"));
    if (canFail === false) {
      continue;
    }
    states.set(scopeKey, { ...current, status: "failed", message });
    changed = true;
  }
  if (changed) {
    $materializedContentViewStates.set(states);
  }
};

export const removeMaterializedContentRoot = ({
  blockInstanceId,
  renderScope,
}: {
  blockInstanceId: string;
  renderScope: string;
}) => {
  const roots = new Map($materializedContentRoots.get());
  const scopeKey = getContentBlockRenderScopeKey(blockInstanceId, renderScope);
  roots.delete(scopeKey);
  $materializedContentRoots.set(roots);
  const states = new Map($materializedContentViewStates.get());
  states.delete(scopeKey);
  $materializedContentViewStates.set(states);
  setContentBlockSourceSwitching({
    blockInstanceId,
    renderScope,
    switching: false,
  });
};

export const registerContentStorageSaver = ({
  blockInstanceId,
  renderScope,
  preflight,
  save,
  isCurrent,
}: {
  blockInstanceId: string;
  renderScope: string;
  preflight: StorageSaver;
  save: StorageSaver;
  isCurrent: StorageSaverEntry["isCurrent"];
}) => {
  const key = getContentBlockRenderScopeKey(blockInstanceId, renderScope);
  const entry = { preflight, save, isCurrent };
  storageSavers.set(key, entry);
  return () => {
    if (storageSavers.get(key) === entry) {
      storageSavers.delete(key);
    }
  };
};

export const saveMaterializedContentChanges = async (
  changes: readonly ContentStorageChange[],
  {
    projectStep,
    loadedRoots = [],
  }: {
    projectStep?: Readonly<{
      order: "before" | "after";
      preflight: () => Promise<StorageSaveResult> | StorageSaveResult;
      save: () => Promise<StorageSaveResult> | StorageSaveResult;
    }>;
    loadedRoots?: readonly MaterializedMdxAuthoredContentRoot[];
  } = {}
): Promise<StorageSaveResult> => {
  const blocker = getMaterializedContentSaveBlocker(changes, {
    copySourceRoots: loadedRoots,
  });
  if (blocker !== undefined) {
    return blocker;
  }
  if (changes.length === 0 && projectStep === undefined) {
    return { status: "applied" };
  }
  const groupedChanges = new Map<
    string,
    {
      identity: ContentBlockExternalContentIdentity;
      changes: ContentStorageChange[];
    }
  >();
  for (const change of changes) {
    const key = getContentStorageIdentityKey(change.root.identity);
    const group = groupedChanges.get(key) ?? {
      identity: change.root.identity,
      changes: [],
    };
    group.changes.push(change);
    groupedChanges.set(key, group);
  }
  const rootsByIdentity = new Map(
    loadedRoots.map((root) => [
      getContentStorageIdentityKey(root.identity),
      root,
    ])
  );
  const activeRoots = $activeMaterializedContentRoots.get();
  const assetSteps = [...groupedChanges.values()].map((group) => {
    const scopeKey = getContentBlockRenderScopeKey(
      group.identity.blockInstanceId,
      group.identity.renderScope
    );
    const saver = storageSavers.get(scopeKey)!;
    const relevantRoots = new Map<string, MaterializedMdxAuthoredContentRoot>();
    for (const change of group.changes) {
      for (const root of getContentStorageChangeRoots(change)) {
        if (root.type !== "external") {
          continue;
        }
        const key = getContentStorageIdentityKey(root.identity);
        let loadedRoot = rootsByIdentity.get(key);
        if (loadedRoot === undefined) {
          const activeRoot = activeRoots.get(
            getContentBlockRenderScopeKey(
              root.identity.blockInstanceId,
              root.identity.renderScope
            )
          );
          if (
            activeRoot !== undefined &&
            isAuthoredRoot(activeRoot) &&
            getContentStorageIdentityKey(activeRoot.identity) === key
          ) {
            loadedRoot = activeRoot;
          }
        }
        if (loadedRoot !== undefined) {
          relevantRoots.set(key, loadedRoot);
        }
      }
    }
    const saverRoots = [...relevantRoots.values()];
    return {
      type: "asset" as const,
      root: group.identity,
      preflight: async () => {
        const result = await saver.preflight(group.changes, saverRoots);
        return result.status === "applied"
          ? { status: "ready" as const }
          : {
              status: "failed" as const,
              code: "content-source-session-failed",
              message: result.message,
            };
      },
      persist: async () => {
        const result = await saver.save(group.changes, saverRoots);
        return result.status === "applied"
          ? { status: "saved" as const }
          : {
              status: "failed" as const,
              code: "content-source-session-failed",
              message: result.message,
            };
      },
    };
  });
  const projectPlan =
    projectStep === undefined
      ? []
      : [
          {
            type: "project" as const,
            preflight: async () => {
              const result = await projectStep.preflight();
              return result.status === "applied"
                ? { status: "ready" as const }
                : {
                    status: "failed" as const,
                    code: "content-source-session-failed",
                    message: result.message,
                  };
            },
            persist: async () => {
              const result = await projectStep.save();
              return result.status === "applied"
                ? { status: "saved" as const }
                : {
                    status: "failed" as const,
                    code: "content-source-session-failed",
                    message: result.message,
                  };
            },
          },
        ];
  const persistence = await executeContentBlockPersistencePlan(
    projectStep?.order === "before"
      ? [...projectPlan, ...assetSteps]
      : [...assetSteps, ...projectPlan]
  );
  if (persistence.status === "complete") {
    return { status: "applied", persistence };
  }
  const failure = persistence.steps.find(({ status }) => status === "failed");
  return {
    status: persistence.status === "partial" ? "partial" : "blocked",
    message:
      failure?.message ??
      (persistence.status === "partial"
        ? "Some content changes were saved. Retry the unfinished steps."
        : "The content changes could not be saved."),
    persistence,
  };
};

export const getMaterializedContentSaveBlocker = (
  changes: readonly ContentStorageChange[],
  {
    copySourceRoots = [],
  }: {
    copySourceRoots?: readonly MaterializedMdxAuthoredContentRoot[];
  } = {}
): Readonly<{ status: "blocked"; message: string }> | undefined => {
  if (changes.length === 0) {
    return;
  }
  const copySourceRootKeys = new Set(
    copySourceRoots.map((root) => getContentStorageIdentityKey(root.identity))
  );
  const validateRoot = (
    root: Extract<ContentStorageRoot, { type: "external" }>,
    allowNewerRevision: boolean
  ): Readonly<{ status: "blocked"; message: string }> | undefined => {
    const scopeKey = getContentBlockRenderScopeKey(
      root.identity.blockInstanceId,
      root.identity.renderScope
    );
    const status = getMaterializedContentStatus({
      blockInstanceId: root.identity.blockInstanceId,
      renderScope: root.identity.renderScope,
    });
    if (status !== "ready" && status !== "empty" && status !== "pending") {
      return {
        status: "blocked",
        message: "The MDX content source is not ready for editing.",
      };
    }
    const currentRoot = $activeMaterializedContentRoots.get().get(scopeKey);
    if (
      currentRoot === undefined ||
      (allowNewerRevision
        ? currentRoot.identity.assetId !== root.identity.assetId ||
          currentRoot.identity.format !== root.identity.format
        : getContentStorageIdentityKey(currentRoot.identity) !==
          getContentStorageIdentityKey(root.identity))
    ) {
      return {
        status: "blocked",
        message: "The MDX content source changed before the edit was saved.",
      };
    }
    const saver = storageSavers.get(scopeKey);
    if (saver === undefined) {
      return {
        status: "blocked",
        message: "The MDX content source is not ready for editing.",
      };
    }
    if (saver.isCurrent(currentRoot) === false) {
      return {
        status: "blocked",
        message: "The MDX content source changed before the edit was saved.",
      };
    }
  };
  for (const change of changes) {
    const targetBlocker = validateRoot(change.root, false);
    if (targetBlocker !== undefined) {
      return targetBlocker;
    }
    const copySource = change.copySource?.root;
    if (copySource?.type !== "external") {
      continue;
    }
    const hasCopySourceSnapshot = copySourceRootKeys.has(
      getContentStorageIdentityKey(copySource.identity)
    );
    const sourceBlocker = validateRoot(copySource, hasCopySourceSnapshot);
    if (sourceBlocker !== undefined) {
      return sourceBlocker;
    }
  }
};

let materializedContentGeneration = 0;
let materializedContentAbortController = new AbortController();

export const getMaterializedContentGeneration = () =>
  materializedContentGeneration;
export const getMaterializedContentAbortSignal = () =>
  materializedContentAbortController.signal;

export const resetMaterializedContent = () => {
  materializedContentAbortController.abort();
  materializedContentAbortController = new AbortController();
  materializedContentGeneration += 1;
  $materializedContentRoots.set(new Map());
  $materializedContentViewStates.set(new Map());
  $switchingContentScopes.set(new Set());
  storageSavers.clear();
  notifiedDiagnosticKeys.clear();
  notifiedStateKeys.clear();
};

let materializedProjectId = $project.get()?.id;
$project.listen((project) => {
  if (project?.id === materializedProjectId) {
    return;
  }
  materializedProjectId = project?.id;
  resetMaterializedContent();
});
