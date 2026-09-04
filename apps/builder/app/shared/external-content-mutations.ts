import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts";
import {
  applyBuilderNamespacePatches,
  type BuilderState,
} from "@webstudio-is/project-build/state";
import type {
  ContentBlockExternalContentIdentity,
  ContentBlockDiagnostic,
  Instance,
  Instances,
  Prop,
} from "@webstudio-is/sdk";
import {
  blockBodyComponent,
  blockComponent,
  findContentBlockTemplateContainers,
} from "@webstudio-is/sdk";
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
  templateContainerIds?: readonly Instance["id"][];
  templateOwnership?: ExternalContentOwnership;
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
const templateMutationListeners = new Set<
  (rootKeys: readonly string[]) => void
>();
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

export const subscribeExternalContentTemplateMutations = (
  listener: (rootKeys: readonly string[]) => void
) => {
  templateMutationListeners.add(listener);
  return () => templateMutationListeners.delete(listener);
};

export const publishExternalContentTemplateMutation = (
  rootKeys: readonly string[]
) => {
  if (rootKeys.length === 0) {
    return;
  }
  for (const listener of templateMutationListeners) {
    listener(rootKeys);
  }
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

const getTemplateContainerIds = (
  instances: Instances,
  blockInstanceId: Instance["id"]
) => {
  const block = instances.get(blockInstanceId);
  return block === undefined
    ? []
    : findContentBlockTemplateContainers({
        blockInstance: block,
        instances,
      }).map(({ id }) => id);
};

export const getAffectedExternalContentTemplateRootKeys = ({
  state,
  roots,
  payload,
}: {
  state: ExternalContentMutationState;
  roots: ReadonlyMap<string, ExternalContentRoot>;
  payload: readonly BuilderPatchChange[];
}) => {
  const instancePatches = payload.flatMap((change) =>
    change.namespace === "instances" ? change.patches : []
  );
  let nextInstances: Instances | undefined;
  if (instancePatches.length > 0) {
    const relevantInstanceIds = new Set<string>();
    for (const root of roots.values()) {
      const sourceBlockInstanceId =
        root.sourceBlockInstanceId ?? root.blockInstanceId;
      relevantInstanceIds.add(sourceBlockInstanceId);
      for (const child of state.instances.get(sourceBlockInstanceId)
        ?.children ?? []) {
        if (child.type === "id") {
          relevantInstanceIds.add(child.value);
        }
      }
    }
    for (const patch of instancePatches) {
      const id = getPatchId(patch);
      if (id !== undefined) {
        relevantInstanceIds.add(id);
      }
    }
    const relevantInstances = new Map(
      Array.from(relevantInstanceIds).flatMap((id) => {
        const instance = state.instances.get(id);
        return instance === undefined ? [] : ([[id, instance]] as const);
      })
    );
    nextInstances = applyBuilderNamespacePatches(
      relevantInstances,
      instancePatches
    );
    for (const root of roots.values()) {
      const sourceBlockInstanceId =
        root.sourceBlockInstanceId ?? root.blockInstanceId;
      for (const child of nextInstances.get(sourceBlockInstanceId)?.children ??
        []) {
        if (child.type !== "id" || nextInstances.has(child.value)) {
          continue;
        }
        const instance = state.instances.get(child.value);
        if (instance !== undefined) {
          nextInstances.set(child.value, instance);
        }
      }
    }
  }
  return Array.from(roots)
    .filter(([, root]) => {
      const sourceBlockInstanceId =
        root.sourceBlockInstanceId ?? root.blockInstanceId;
      const currentTemplateContainerIds = getTemplateContainerIds(
        state.instances,
        sourceBlockInstanceId
      );
      if (
        root.templateContainerIds !== undefined &&
        (root.templateContainerIds.length !==
          currentTemplateContainerIds.length ||
          root.templateContainerIds.some(
            (id, index) => id !== currentTemplateContainerIds[index]
          ))
      ) {
        return true;
      }
      if (nextInstances !== undefined) {
        const nextTemplateContainerIds = getTemplateContainerIds(
          nextInstances,
          sourceBlockInstanceId
        );
        if (
          currentTemplateContainerIds.length !==
            nextTemplateContainerIds.length ||
          currentTemplateContainerIds.some(
            (id, index) => id !== nextTemplateContainerIds[index]
          )
        ) {
          return true;
        }
      }
      const ownership = root.templateOwnership;
      if (ownership === undefined) {
        return false;
      }
      return doesMutationAffectRoot({
        state,
        root: {
          ...root,
          instanceIds: ownership.instances ?? new Set(),
          propIds: ownership.props,
          ownership,
        },
        payload,
        includeContentContainer: false,
      });
    })
    .map(([key]) => key);
};

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
  includeContentContainer,
}: {
  root: ExternalContentRoot;
  change: BuilderPatchChange;
  includeContentContainer: boolean;
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
      includeContentContainer &&
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
  includeContentContainer = true,
}: {
  state: ExternalContentMutationState;
  root: ExternalContentRoot;
  payload: readonly BuilderPatchChange[];
  includeContentContainer?: boolean;
}) =>
  payload.some((change) => {
    if (change.namespace === "instances") {
      return affectsRootInstances({ root, change, includeContentContainer });
    }
    if (change.namespace === "props") {
      return affectsRootProps({ state, root, change });
    }
    const ownedIds =
      root.ownership?.[change.namespace as keyof ExternalContentOwnership];
    return change.patches.some((patch) => {
      const id = getPatchId(patch);
      if (id !== undefined && ownedIds?.has(id) === true) {
        return true;
      }
      if (includeContentContainer || id === undefined) {
        return false;
      }
      if (
        change.namespace === "styleSourceSelections" &&
        root.instanceIds.has(id)
      ) {
        return true;
      }
      if (
        patch.op === "remove" ||
        patch.path.length !== 1 ||
        typeof patch.value !== "object" ||
        patch.value === null
      ) {
        return false;
      }
      if (change.namespace === "styles" && "styleSourceId" in patch.value) {
        return (
          root.ownership?.styleSources?.has(
            String(patch.value.styleSourceId)
          ) === true
        );
      }
      return false;
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
