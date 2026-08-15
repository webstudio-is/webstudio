import { atom, computed } from "nanostores";
import {
  createContentStorageSelectorProjection,
  findBlockSelector,
  getContentStorageIdentityKey,
  type ContentStorageChange,
  type MaterializedContentRoot,
} from "@webstudio-is/project-build/runtime";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";
import type {
  Asset,
  Breakpoint,
  DataSource,
  Instance,
  Instances,
  Prop,
  Resource,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import {
  blockTemplateComponent,
  getContentBlockSource,
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
  | Readonly<{ status: "applied" }>
  | Readonly<{ status: "blocked"; message: string }>;

type StorageSaver = (
  changes: readonly ContentStorageChange[]
) => Promise<StorageSaveResult>;

type StorageSaverEntry = {
  save: StorageSaver;
  isCurrent: (root: MaterializedContentRoot) => boolean;
};

const getRenderScopeKey = ({ identity }: MaterializedContentRoot): string =>
  JSON.stringify([identity.blockInstanceId, identity.renderScope]);

export const $materializedContentRoots = atom<
  ReadonlyMap<string, MaterializedContentRoot>
>(new Map());
export const $materializedContentStatuses = atom<
  ReadonlyMap<string, "loading" | "ready" | "failed">
>(new Map());

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

const $contentStorageProjection = computed(
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

export const getRuntimeInstanceChildren = (
  instance: Instance,
  instanceSelector: InstanceSelector
) =>
  $contentStorageProjection
    .get()
    .getInstanceChildren(instance, JSON.stringify(instanceSelector));

export const getMaterializedContentStatus = ({
  blockInstanceId,
  renderScope,
}: {
  blockInstanceId: string;
  renderScope: string;
}) =>
  $materializedContentStatuses
    .get()
    .get(JSON.stringify([blockInstanceId, renderScope]));

export const isMaterializedInstanceEditable = ({
  instanceSelector,
  instances,
}: {
  instanceSelector: InstanceSelector;
  instances: Instances;
}) => {
  const blockSelector = findBlockSelector({
    anchor: instanceSelector,
    instances,
  });
  if (blockSelector === undefined) {
    return true;
  }
  const root = $activeMaterializedContentRoots
    .get()
    .get(JSON.stringify([blockSelector[0], JSON.stringify(blockSelector)]));
  if (
    root === undefined ||
    root.fragment.instances.some(({ id }) => id === instanceSelector[0]) ===
      false
  ) {
    return true;
  }
  return (
    getMaterializedContentStatus({
      blockInstanceId: root.identity.blockInstanceId,
      renderScope: root.identity.renderScope,
    }) === "ready"
  );
};

const storageSavers = new Map<string, StorageSaverEntry>();

const getExternalStorageChanges = (changes: readonly ContentStorageChange[]) =>
  changes.filter(
    (
      change
    ): change is ContentStorageChange & {
      root: Extract<ContentStorageChange["root"], { type: "external" }>;
    } => change.root.type === "external"
  );

export const publishMaterializedContentRoot = (
  root: MaterializedContentRoot
) => {
  const roots = new Map($materializedContentRoots.get());
  roots.set(getRenderScopeKey(root), root);
  $materializedContentRoots.set(roots);
  const statuses = new Map($materializedContentStatuses.get());
  statuses.set(getRenderScopeKey(root), "ready");
  $materializedContentStatuses.set(statuses);
};

export const setMaterializedContentStatus = ({
  blockInstanceId,
  renderScope,
  status,
}: {
  blockInstanceId: string;
  renderScope: string;
  status: "loading" | "failed";
}) => {
  const statuses = new Map($materializedContentStatuses.get());
  statuses.set(JSON.stringify([blockInstanceId, renderScope]), status);
  $materializedContentStatuses.set(statuses);
};

export const removeMaterializedContentRoot = ({
  blockInstanceId,
  renderScope,
}: {
  blockInstanceId: string;
  renderScope: string;
}) => {
  const roots = new Map($materializedContentRoots.get());
  roots.delete(JSON.stringify([blockInstanceId, renderScope]));
  $materializedContentRoots.set(roots);
  const statuses = new Map($materializedContentStatuses.get());
  statuses.delete(JSON.stringify([blockInstanceId, renderScope]));
  $materializedContentStatuses.set(statuses);
};

export const registerContentStorageSaver = ({
  blockInstanceId,
  renderScope,
  save,
  isCurrent,
}: {
  blockInstanceId: string;
  renderScope: string;
  save: StorageSaver;
  isCurrent: StorageSaverEntry["isCurrent"];
}) => {
  const key = JSON.stringify([blockInstanceId, renderScope]);
  const entry = { save, isCurrent };
  storageSavers.set(key, entry);
  return () => {
    if (storageSavers.get(key) === entry) {
      storageSavers.delete(key);
    }
  };
};

export const saveMaterializedContentChanges = async (
  changes: readonly ContentStorageChange[]
): Promise<StorageSaveResult> => {
  const blocker = getMaterializedContentSaveBlocker(changes);
  if (blocker !== undefined) {
    return blocker;
  }
  const externalChanges = getExternalStorageChanges(changes);
  if (externalChanges.length === 0) {
    return { status: "applied" };
  }
  const [change] = externalChanges;
  const scopeKey = JSON.stringify([
    change.root.identity.blockInstanceId,
    change.root.identity.renderScope,
  ]);
  const saver = storageSavers.get(scopeKey)!;
  return saver.save(externalChanges);
};

export const getMaterializedContentSaveBlocker = (
  changes: readonly ContentStorageChange[]
): Extract<StorageSaveResult, { status: "blocked" }> | undefined => {
  const externalChanges = getExternalStorageChanges(changes);
  if (externalChanges.length === 0) {
    return;
  }
  if (
    new Set(
      externalChanges.map(({ root }) =>
        getContentStorageIdentityKey(root.identity)
      )
    ).size !== 1
  ) {
    return {
      status: "blocked",
      message: "Editing multiple MDX files atomically is not available yet.",
    };
  }
  const [change] = externalChanges;
  const scopeKey = JSON.stringify([
    change.root.identity.blockInstanceId,
    change.root.identity.renderScope,
  ]);
  if ($materializedContentStatuses.get().get(scopeKey) !== "ready") {
    return {
      status: "blocked",
      message: "The MDX content source is not ready for editing.",
    };
  }
  const currentRoot = $activeMaterializedContentRoots.get().get(scopeKey);
  if (
    currentRoot === undefined ||
    getContentStorageIdentityKey(currentRoot.identity) !==
      getContentStorageIdentityKey(change.root.identity)
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

export const resetMaterializedContent = () => {
  $materializedContentRoots.set(new Map());
  $materializedContentStatuses.set(new Map());
  storageSavers.clear();
};

let materializedProjectId = $project.get()?.id;
$project.listen((project) => {
  if (project?.id === materializedProjectId) {
    return;
  }
  materializedProjectId = project?.id;
  resetMaterializedContent();
});
