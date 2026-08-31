import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts";
import type { BuilderState } from "@webstudio-is/project-build/state";
import type {
  ContentBlockExternalContentIdentity,
  ContentBlockDiagnostic,
  Instance,
  Instances,
  Prop,
} from "@webstudio-is/sdk";
import { blockBodyComponent, blockComponent } from "@webstudio-is/sdk";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";
import type { MdxDocument } from "@webstudio-is/content-engine/mdx";
import { atom } from "nanostores";
import type { ExternalContentOwnership } from "./external-content-persistence";

export type ExternalContentRoot = {
  sourceBlockInstanceId?: Instance["id"];
  sourceRenderScope?: string;
  blockInstanceId: Instance["id"];
  sourceContentInstanceId?: Instance["id"];
  /** Instance whose children are persisted as document.body. */
  contentInstanceId?: Instance["id"];
  renderScope?: string;
  instanceIds: ReadonlySet<Instance["id"]>;
  propIds?: ReadonlySet<Prop["id"]>;
  ownership?: ExternalContentOwnership;
  mutationRevision: number;
  projectId?: string;
  identity?: ContentBlockExternalContentIdentity;
  diagnostics?: readonly ContentBlockDiagnostic[];
  document?: MdxDocument;
  frontmatter?: Readonly<Record<string, unknown>>;
  transientInstanceIds?: ReadonlySet<Instance["id"]>;
};

export const findExternalContentRoot = (
  roots: ReadonlyMap<string, ExternalContentRoot>,
  sourceBlockInstanceId: Instance["id"],
  renderScope: string
) => {
  for (const root of roots.values()) {
    if (
      (root.sourceBlockInstanceId ?? root.blockInstanceId) ===
        sourceBlockInstanceId &&
      (root.sourceRenderScope ?? root.renderScope) === renderScope
    ) {
      return root;
    }
  }
};

export const findExternalContentRootEntryBySelector = (
  roots: ReadonlyMap<string, ExternalContentRoot>,
  selector: InstanceSelector
) => {
  let closest:
    | readonly [key: string, root: ExternalContentRoot, blockIndex: number]
    | undefined;
  for (const [key, root] of roots) {
    let blockIndex = selector.indexOf(root.blockInstanceId);
    if (blockIndex === -1 && root.sourceBlockInstanceId !== undefined) {
      blockIndex = selector.indexOf(root.sourceBlockInstanceId);
    }
    if (
      blockIndex !== -1 &&
      (closest === undefined || blockIndex < closest[2])
    ) {
      closest = [key, root, blockIndex];
    }
  }
  return closest === undefined
    ? undefined
    : ([closest[0], closest[1]] as const);
};

export const resolveExternalContentOccurrence = ({
  sourceInstance,
  sourceSelector,
  instances,
  roots,
}: {
  sourceInstance: Instance;
  sourceSelector: InstanceSelector;
  instances: Instances;
  roots: ReadonlyMap<string, ExternalContentRoot>;
}) => {
  if (
    sourceInstance.component !== blockComponent &&
    sourceInstance.component !== blockBodyComponent
  ) {
    return;
  }
  const root =
    sourceInstance.component === blockComponent
      ? findExternalContentRoot(
          roots,
          sourceInstance.id,
          JSON.stringify(sourceSelector)
        )
      : Array.from(roots.values()).find(
          (root) =>
            root.sourceContentInstanceId === sourceInstance.id &&
            sourceSelector.includes(root.blockInstanceId)
        );
  const occurrenceInstanceId =
    sourceInstance.component === blockBodyComponent
      ? root?.contentInstanceId
      : root?.blockInstanceId;
  const instance =
    occurrenceInstanceId === undefined
      ? undefined
      : instances.get(occurrenceInstanceId);
  if (instance === undefined) {
    return;
  }
  return {
    instance,
    selector: [instance.id, ...sourceSelector.slice(1)] as InstanceSelector,
  };
};

export const getExternalContentSourceSelector = ({
  selector,
  roots,
}: {
  selector: InstanceSelector;
  roots: ReadonlyMap<string, ExternalContentRoot>;
}) => {
  for (const root of roots.values()) {
    const sourceId = root.sourceBlockInstanceId;
    if (sourceId === undefined || sourceId === root.blockInstanceId) {
      continue;
    }
    const blockIndex = selector.indexOf(root.blockInstanceId);
    if (blockIndex !== -1) {
      return {
        contentSelector: selector.slice(0, blockIndex + 1),
        sourceSelector: [sourceId, ...selector.slice(blockIndex + 1)],
      };
    }
  }
};

export const $externalContentRoots = atom(
  new Map<string, ExternalContentRoot>()
);
const mutationListeners = new Set<(rootKeys: readonly string[]) => void>();
const observedMutationRevisions = new Map<string, number>();

$externalContentRoots.listen((roots) => {
  const changedRootKeys: string[] = [];
  for (const [key, root] of roots) {
    const previousRevision = observedMutationRevisions.get(key);
    observedMutationRevisions.set(key, root.mutationRevision);
    if (
      previousRevision !== undefined &&
      root.mutationRevision > previousRevision
    ) {
      changedRootKeys.push(key);
    }
  }
  for (const key of observedMutationRevisions.keys()) {
    if (roots.has(key) === false) {
      observedMutationRevisions.delete(key);
    }
  }
  if (changedRootKeys.length > 0) {
    for (const listener of mutationListeners) {
      listener(changedRootKeys);
    }
  }
});

export const registerExternalContentRoot = (
  key: string,
  root: ExternalContentRoot
) => {
  const current = $externalContentRoots.get();
  const registeredRoot = {
    ...root,
    mutationRevision: current.get(key)?.mutationRevision ?? 0,
  };
  $externalContentRoots.set(new Map(current).set(key, registeredRoot));
  return () => {
    const roots = $externalContentRoots.get();
    if (roots.get(key) === registeredRoot) {
      const nextRoots = new Map(roots);
      nextRoots.delete(key);
      $externalContentRoots.set(nextRoots);
    }
  };
};

export const getExternalContentRoots = () => $externalContentRoots.get();

export const isExternalContentInstance = (
  roots: ReadonlyMap<string, ExternalContentRoot>,
  instanceId: Instance["id"]
) => {
  for (const { instanceIds } of roots.values()) {
    if (instanceIds.has(instanceId)) {
      return true;
    }
  }
  return false;
};

export const externalContentInstanceNameMessage =
  "Names cannot be edited for MDX content.";

export const subscribeExternalContentMutations = (
  listener: (rootKeys: readonly string[]) => void
) => {
  mutationListeners.add(listener);
  return () => mutationListeners.delete(listener);
};

export const publishExternalContentMutation = (rootKeys: readonly string[]) => {
  if (rootKeys.length === 0) {
    return;
  }
  const roots = $externalContentRoots.get();
  const nextRoots = new Map(roots);
  let changed = false;
  for (const key of rootKeys) {
    const root = roots.get(key);
    if (root !== undefined) {
      root.mutationRevision += 1;
      changed = true;
    }
  }
  if (changed) {
    $externalContentRoots.set(nextRoots);
  }
};

export const getAffectedExternalContentRootKeys = ({
  state,
  roots,
  payload,
}: {
  state: ExternalContentMutationState;
  roots: ReadonlyMap<string, ExternalContentRoot>;
  payload: readonly BuilderPatchChange[];
}) =>
  Array.from(roots)
    .filter(([, root]) => doesMutationAffectRoot({ state, root, payload }))
    .map(([key]) => key);

type ExternalContentMutationState = {
  instances: NonNullable<BuilderState["instances"]>;
  props?: BuilderState["props"];
};

const getPatchId = (patch: BuilderPatchChange["patches"][number]) => {
  const [id] = patch.path;
  return typeof id === "string" ? id : undefined;
};

const affectsRootInstances = ({
  root,
  change,
}: {
  root: ExternalContentRoot;
  change: BuilderPatchChange;
}) => {
  for (const patch of change.patches) {
    const id = getPatchId(patch);
    if (id === undefined) {
      continue;
    }
    if (root.instanceIds.has(id)) {
      return true;
    }
    if (
      id === (root.contentInstanceId ?? root.blockInstanceId) &&
      patch.path[1] === "children"
    ) {
      return true;
    }
    if (
      patch.op !== "remove" &&
      patch.path.length === 1 &&
      typeof patch.value === "object" &&
      patch.value !== null &&
      "instanceId" in patch.value &&
      root.instanceIds.has(String(patch.value.instanceId))
    ) {
      return true;
    }
  }
  return false;
};

const affectsRootProps = ({
  state,
  root,
  change,
}: {
  state: ExternalContentMutationState;
  root: ExternalContentRoot;
  change: BuilderPatchChange;
}) => {
  for (const patch of change.patches) {
    const id = getPatchId(patch);
    if (id === undefined) {
      continue;
    }
    const existing = state.props?.get(id);
    const added =
      patch.op !== "remove" &&
      patch.path.length === 1 &&
      typeof patch.value === "object" &&
      patch.value !== null &&
      "instanceId" in patch.value
        ? patch.value
        : undefined;
    if (
      root.propIds?.has(id) ||
      (existing !== undefined && root.instanceIds.has(existing.instanceId)) ||
      (added !== undefined && root.instanceIds.has(String(added.instanceId)))
    ) {
      return true;
    }
  }
  return false;
};

const doesMutationAffectRoot = ({
  state,
  root,
  payload,
}: {
  state: ExternalContentMutationState;
  root: ExternalContentRoot;
  payload: readonly BuilderPatchChange[];
}) =>
  payload.some((change) => {
    if (change.namespace === "instances") {
      return affectsRootInstances({ root, change });
    }
    if (change.namespace === "props") {
      return affectsRootProps({ state, root, change });
    }
    const ownedIds =
      root.ownership?.[change.namespace as keyof ExternalContentOwnership];
    return change.patches.some((patch) => {
      const id = getPatchId(patch);
      return id !== undefined && ownedIds?.has(id) === true;
    });
  });

export const isExternalContentMutation = ({
  state,
  roots,
  payload,
}: {
  state: ExternalContentMutationState;
  roots: ReadonlyMap<string, ExternalContentRoot>;
  payload: readonly BuilderPatchChange[];
}) =>
  Array.from(roots.values()).some((root) =>
    doesMutationAffectRoot({ state, root, payload })
  );
