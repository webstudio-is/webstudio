// Data utilities own access to Webstudio's instance-related stores and
// transaction boundaries. Put generic store reads/writes and content-mode data
// guards here, not tree-shape mutations.
import { toast } from "@webstudio-is/design-system";
import { type WebstudioData, isPageTemplate } from "@webstudio-is/sdk";
import {
  BuilderRuntimeError,
  blockTemplateNameConfirmationInput,
  createRuntimeMutation,
  executeBuilderRuntimeOperation,
  createRuntimeMutationAccumulator,
  getContentBlockRenderScopeKey,
  getContentStorageChangeRoots,
  getContentStorageIdentityKey,
  getRuntimeMutationPersistenceOrder,
  type ContentStorageChange,
  type MaterializedContentRoot,
  type MaterializedMdxAuthoredContentRoot,
  type BuilderRuntimeOperationInput,
  type BuilderRuntimeMutationOperationId,
  type BuilderRuntimeOperationResult,
} from "@webstudio-is/project-build/runtime";
import { atom } from "nanostores";
import {
  builderRuntimeContext,
  type BuilderRuntimeContext,
} from "@webstudio-is/project-build/runtime";
import { type BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime";
import { $canOpenPageTemplates, $selectedPage } from "../nano-states";
import { createTransactionFromBuilderPatchPayload } from "../sync/builder-patch";
import {
  $project,
  hasSameBuilderStateStoreReferences,
  readBuilderStateStores,
} from "../sync/data-stores";
import {
  $allSelectedInstanceSelectors,
  clearInstanceSelection,
  selectInstance,
} from "../nano-states";
import {
  applyMaterializedContentChanges,
  getMaterializedContentStatus,
  getMaterializedContentAbortSignal,
  getMaterializedContentGeneration,
  getMaterializedContentForSelectors,
  getMaterializedContentSaveBlocker,
  isAuthoredRoot,
  saveMaterializedContentChanges,
  $activeMaterializedContentRoots,
  $contentBlockPresentationItems,
  $runtimeAssets,
  $runtimeBreakpoints,
  $runtimeDataSources,
  $runtimeInstances,
  $runtimeProps,
  $runtimeResources,
  $runtimeStyles,
  $runtimeStyleSources,
  $runtimeStyleSourceSelections,
  failPendingMaterializedContentChanges,
  publishPendingMaterializedContentChanges,
} from "../content-block-content";

type RuntimeMutationResult<Id extends BuilderRuntimeMutationOperationId> =
  Extract<BuilderRuntimeOperationResult<Id>, BuilderRuntimeMutation>;

export type RuntimeMutationOperation = {
  [Id in BuilderRuntimeMutationOperationId]: {
    id: Id;
    input: BuilderRuntimeOperationInput<Id>;
  };
}[BuilderRuntimeMutationOperationId];

type TemplateNameConfirmation = ReturnType<
  typeof blockTemplateNameConfirmationInput.parse
>;

type PendingTemplateNameConfirmation =
  | {
      operation: RuntimeMutationOperation;
      confirmation: TemplateNameConfirmation;
    }
  | {
      operations: readonly RuntimeMutationOperation[];
      operationIndex: number;
      confirmation: TemplateNameConfirmation;
    };

export const $pendingTemplateNameConfirmation = atom<
  PendingTemplateNameConfirmation | undefined
>(undefined);

const getTemplateNameConfirmation = (error: unknown) => {
  if (error instanceof BuilderRuntimeError === false) {
    return;
  }
  const issue = error.issues?.find(
    ({ code }) => code === "template_name_change_requires_confirmation"
  );
  const result = blockTemplateNameConfirmationInput.safeParse(issue?.example);
  return result.success ? result.data : undefined;
};

const addTemplateNameConfirmation = (
  operation: RuntimeMutationOperation,
  confirmation: TemplateNameConfirmation
) =>
  ({
    ...operation,
    input: { ...operation.input, templateNameConfirmation: confirmation },
  }) as RuntimeMutationOperation;

export const getDuplicateTemplateNameMessage = (error: unknown) => {
  if (error instanceof BuilderRuntimeError === false) {
    return;
  }
  return error.issues?.find(({ code }) => code === "duplicate_template_name")
    ?.message;
};

export type WebstudioInstanceData = Pick<
  WebstudioData,
  | "instances"
  | "props"
  | "styleSourceSelections"
  | "styleSources"
  | "styles"
  | "dataSources"
  | "resources"
>;

const canCommitWebstudioData = () => {
  const selectedPage = $selectedPage.get();
  return (
    isPageTemplate(selectedPage) === false ||
    $canOpenPageTemplates.get() === true
  );
};

export const migrateLoadedWebstudioData = () => {
  const result = executeRuntimeMutation({
    id: "system.migrateLoadedData",
    input: {},
  });
  if (result?.result.didBreakCycles === true) {
    toast.info("Detected and fixed cycles in the instance tree.");
  }
};

const getSelectedMaterializedContent = () =>
  getMaterializedContentForSelectors($allSelectedInstanceSelectors.get());

const getRuntimeMutationContext = () => ({
  createId: builderRuntimeContext.createId,
  projectId: $project.get()?.id,
  materializedContent: getSelectedMaterializedContent(),
  returnStorageChanges: true,
});

const canEditMaterializedContent = (
  roots: readonly MaterializedContentRoot[],
  checkSelectedPresentation = true
) => {
  if (
    checkSelectedPresentation &&
    $allSelectedInstanceSelectors
      .get()
      .some(([instanceId]) =>
        $contentBlockPresentationItems.get().has(instanceId)
      )
  ) {
    toast.error("MDX diagnostic notices cannot be edited.");
    return false;
  }
  for (const { identity } of roots) {
    const status = getMaterializedContentStatus({
      blockInstanceId: identity.blockInstanceId,
      renderScope: identity.renderScope,
    });
    if (status !== "ready" && status !== "empty" && status !== "pending") {
      toast.error("The MDX content source is not ready for editing.");
      return false;
    }
  }
  return true;
};

type RuntimeMutationContext = Pick<
  BuilderRuntimeContext,
  "allowLegacyContentModelWarnings" | "materializedContent"
>;

const requireSynchronousResult = <Result>(
  id: BuilderRuntimeMutationOperationId,
  result: Result | Promise<Result>
): Result => {
  if (result instanceof Promise) {
    throw Error(`Builder runtime operation "${id}" must be synchronous.`);
  }
  return result;
};

const createRuntimeMutationArgs = <
  Id extends BuilderRuntimeMutationOperationId,
>({
  id,
  input,
  context,
  state = getWebstudioData(),
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
  context?: RuntimeMutationContext;
  state?: ReturnType<typeof getWebstudioData>;
}) => ({
  id,
  state,
  input,
  context: { ...getRuntimeMutationContext(), ...context },
});

const materializedPersistenceQueues = new Map<string, Promise<void>>();
const pendingIdentityRematerializationScopes = new Set<string>();
const replannableIdentityRematerializationScopes = new Set<string>();
const projectPersistenceQueueKey = "materialized-project-persistence";
const pendingProjectPersistenceMessage =
  "Wait for the current content change to finish.";
const pendingIdentityRematerializationMessage =
  "Wait for the content change to finish saving.";

const getMaterializedChangeScopeKey = (change: ContentStorageChange) =>
  getContentBlockRenderScopeKey(
    change.root.identity.blockInstanceId,
    change.root.identity.renderScope
  );

const getGenerationQueueKey = (generation: number, key: string) =>
  `${generation}:${key}`;

const getCurrentQueueKey = (key: string) =>
  getGenerationQueueKey(getMaterializedContentGeneration(), key);

const getMaterializedChangeScopeKeys = (change: ContentStorageChange) =>
  getContentStorageChangeRoots(change).flatMap((root) =>
    root.type === "external"
      ? [
          getContentBlockRenderScopeKey(
            root.identity.blockInstanceId,
            root.identity.renderScope
          ),
        ]
      : []
  );

const createsMaterializedInstanceIds = (change: ContentStorageChange) =>
  change.mdxInsert !== undefined ||
  change.payload.some(
    ({ namespace, patches }) =>
      namespace === "instances" &&
      patches.some(({ op, path }) => op === "add" && path.length === 1)
  );

const rematerializesMaterializedInstanceIds = (
  id: BuilderRuntimeMutationOperationId
) =>
  id === "instances.delete" ||
  id === "instances.deleteBySelector" ||
  id === "instances.move" ||
  id === "instances.reparent" ||
  id === "instances.unwrap" ||
  id === "instances.updateTextTree" ||
  id === "instances.wrap";

const hasPendingMaterializedIdentityRematerialization = (
  changes: readonly ContentStorageChange[]
) =>
  changes.some((change) =>
    getMaterializedChangeScopeKeys(change).some((scopeKey) =>
      pendingIdentityRematerializationScopes.has(getCurrentQueueKey(scopeKey))
    )
  );

const hasBlockingIdentityRematerializationForRoots = (
  roots: readonly MaterializedContentRoot[]
) =>
  roots.some((root) => {
    const key = getCurrentQueueKey(
      getContentBlockRenderScopeKey(
        root.identity.blockInstanceId,
        root.identity.renderScope
      )
    );
    return (
      pendingIdentityRematerializationScopes.has(key) &&
      replannableIdentityRematerializationScopes.has(key) === false
    );
  });

const hasPendingProjectPersistence = (
  result: Pick<BuilderRuntimeMutation, "payload">
) =>
  result.payload.length > 0 &&
  materializedPersistenceQueues.has(
    getCurrentQueueKey(projectPersistenceQueueKey)
  );

const getPendingPersistenceMessage = (
  result: Pick<BuilderRuntimeMutation, "payload" | "storageChanges">,
  { allowIdentityReplanning = false } = {}
) => {
  if (hasPendingProjectPersistence(result)) {
    return pendingProjectPersistenceMessage;
  }
  if (
    allowIdentityReplanning === false &&
    result.storageChanges !== undefined &&
    hasPendingMaterializedIdentityRematerialization(result.storageChanges)
  ) {
    return pendingIdentityRematerializationMessage;
  }
};

const serializeMaterializedPersistence = async <Result>({
  changes,
  includesProjectStep,
  generation,
  abortSignal,
  persist,
}: {
  changes: readonly ContentStorageChange[];
  includesProjectStep: boolean;
  generation: number;
  abortSignal: AbortSignal;
  persist: (queuedKeys: ReadonlySet<string>) => Promise<Result>;
}): Promise<Result | undefined> => {
  const scopeKeys = new Set(changes.flatMap(getMaterializedChangeScopeKeys));
  if (includesProjectStep) {
    scopeKeys.add(projectPersistenceQueueKey);
  }
  const keys = new Set(
    [...scopeKeys].map((key) => getGenerationQueueKey(generation, key))
  );
  const queuedKeys = new Set<string>();
  const predecessors = [...scopeKeys].flatMap((scopeKey) => {
    const queue = materializedPersistenceQueues.get(
      getGenerationQueueKey(generation, scopeKey)
    );
    if (queue === undefined) {
      return [];
    }
    queuedKeys.add(scopeKey);
    return [queue];
  });
  let abortPersistence!: () => void;
  const aborted = new Promise<undefined>((resolve) => {
    abortPersistence = () => resolve(undefined);
    abortSignal.addEventListener("abort", abortPersistence, { once: true });
    if (abortSignal.aborted) {
      abortPersistence();
    }
  });
  const persistence = Promise.all(predecessors).then(() => persist(queuedKeys));
  const operation = Promise.race([persistence, aborted]);
  const queue = operation.then(
    () => undefined,
    () => undefined
  );
  for (const key of keys) {
    materializedPersistenceQueues.set(key, queue);
  }
  try {
    return await operation;
  } finally {
    abortSignal.removeEventListener("abort", abortPersistence);
    for (const key of keys) {
      if (materializedPersistenceQueues.get(key) === queue) {
        materializedPersistenceQueues.delete(key);
      }
    }
  }
};

const isSameMaterializedContentSource = (
  left: MaterializedContentRoot["identity"],
  right: MaterializedContentRoot["identity"]
) => left.assetId === right.assetId && left.format === right.format;

const getCurrentMaterializedRoots = (
  roots: readonly MaterializedContentRoot[]
) =>
  roots.map((root) => {
    const scopeKey = getContentBlockRenderScopeKey(
      root.identity.blockInstanceId,
      root.identity.renderScope
    );
    const current = $activeMaterializedContentRoots.get().get(scopeKey);
    return current !== undefined &&
      isSameMaterializedContentSource(root.identity, current.identity)
      ? current
      : root;
  });

const areMaterializedContentSourcesCurrent = (
  roots: readonly MaterializedContentRoot[]
) => {
  const activeRoots = $activeMaterializedContentRoots.get();
  return roots.every((root) => {
    const current = activeRoots.get(
      getContentBlockRenderScopeKey(
        root.identity.blockInstanceId,
        root.identity.renderScope
      )
    );
    return (
      current !== undefined &&
      isSameMaterializedContentSource(root.identity, current.identity)
    );
  });
};

const getAuthoredInstanceStructuralPaths = (
  root: MaterializedMdxAuthoredContentRoot
) => {
  const authoredInstanceIds = new Set(
    root.provenance.nodes.map(({ instanceId }) => instanceId)
  );
  const instances = new Map(
    root.fragment.instances.map((instance) => [instance.id, instance])
  );
  const paths = new Map<string, string>();
  const visit = (
    children: MaterializedMdxAuthoredContentRoot["fragment"]["children"],
    parentPath: readonly number[]
  ) => {
    let authoredIndex = 0;
    for (const child of children) {
      if (
        child.type !== "id" ||
        authoredInstanceIds.has(child.value) === false
      ) {
        continue;
      }
      const path = [...parentPath, authoredIndex];
      paths.set(child.value, JSON.stringify(path));
      authoredIndex += 1;
      const instance = instances.get(child.value);
      if (instance !== undefined) {
        visit(instance.children, path);
      }
    }
  };
  visit(root.fragment.children, []);
  return paths;
};

const getRematerializedInstanceIds = (
  previousRoots: readonly MaterializedContentRoot[],
  currentRoots: readonly MaterializedContentRoot[]
) => {
  const rematerializedIds = new Map<string, string>();
  for (const previous of previousRoots) {
    if (isAuthoredRoot(previous) === false) {
      continue;
    }
    const current = currentRoots.find(
      (root) =>
        root.identity.blockInstanceId === previous.identity.blockInstanceId &&
        root.identity.renderScope === previous.identity.renderScope
    );
    if (current === undefined || isAuthoredRoot(current) === false) {
      continue;
    }
    const previousPaths = getAuthoredInstanceStructuralPaths(previous);
    const currentIdsByPath = new Map(
      Array.from(getAuthoredInstanceStructuralPaths(current), ([id, path]) => [
        path,
        id,
      ])
    );
    for (const [id, path] of previousPaths) {
      const currentId = currentIdsByPath.get(path);
      if (currentId !== undefined) {
        rematerializedIds.set(id, currentId);
      }
    }
  }
  return rematerializedIds;
};

const rebaseMaterializedOperationInput = <
  Id extends BuilderRuntimeMutationOperationId,
>(
  id: Id,
  input: BuilderRuntimeOperationInput<Id>,
  previousRoots: readonly MaterializedContentRoot[],
  currentRoots: readonly MaterializedContentRoot[]
): BuilderRuntimeOperationInput<Id> => {
  const rematerializedIds = getRematerializedInstanceIds(
    previousRoots,
    currentRoots
  );
  const rebaseId = (instanceId: string) =>
    rematerializedIds.get(instanceId) ?? instanceId;
  const rebaseSelector = (selector: readonly string[]) =>
    selector.map(rebaseId);
  if (id === "instances.reparent") {
    const reparentInput =
      input as BuilderRuntimeOperationInput<"instances.reparent">;
    return {
      ...reparentInput,
      sourceInstanceSelector: rebaseSelector(
        reparentInput.sourceInstanceSelector
      ),
      dropTarget: {
        ...reparentInput.dropTarget,
        parentSelector: rebaseSelector(reparentInput.dropTarget.parentSelector),
      },
    } as BuilderRuntimeOperationInput<Id>;
  }
  if (id === "instances.move") {
    const moveInput = input as BuilderRuntimeOperationInput<"instances.move">;
    return {
      ...moveInput,
      moves: moveInput.moves.map((move) => ({
        ...move,
        instanceId: rebaseId(move.instanceId),
        parentInstanceId: rebaseId(move.parentInstanceId),
      })),
    } as BuilderRuntimeOperationInput<Id>;
  }
  if (id === "instances.updateTextTree") {
    const textTreeInput =
      input as BuilderRuntimeOperationInput<"instances.updateTextTree">;
    return {
      ...textTreeInput,
      rootInstanceId: rebaseId(textTreeInput.rootInstanceId),
      instances: textTreeInput.instances.map((instance) => ({
        ...instance,
        id: rebaseId(instance.id),
        children: instance.children.map((child) =>
          child.type === "id"
            ? { ...child, value: rebaseId(child.value) }
            : child
        ),
      })),
    } as BuilderRuntimeOperationInput<Id>;
  }
  if (id === "instances.delete") {
    const deleteInput =
      input as BuilderRuntimeOperationInput<"instances.delete">;
    return {
      ...deleteInput,
      instanceIds: deleteInput.instanceIds.map(rebaseId),
    } as BuilderRuntimeOperationInput<Id>;
  }
  if (
    id === "instances.deleteBySelector" ||
    id === "instances.unwrap" ||
    id === "instances.wrap"
  ) {
    const selectorInput = input as BuilderRuntimeOperationInput<
      "instances.deleteBySelector" | "instances.unwrap" | "instances.wrap"
    >;
    return {
      ...selectorInput,
      instanceSelector: rebaseSelector(selectorInput.instanceSelector),
    } as BuilderRuntimeOperationInput<Id>;
  }
  return input;
};

const getLoadedMaterializedRoots = (
  changes: readonly ContentStorageChange[]
) => {
  const activeRoots = $activeMaterializedContentRoots.get();
  const loadedRoots = new Map<string, MaterializedMdxAuthoredContentRoot>();
  for (const change of changes) {
    for (const root of getContentStorageChangeRoots(change)) {
      if (root.type !== "external") {
        continue;
      }
      const current = activeRoots.get(
        getContentBlockRenderScopeKey(
          root.identity.blockInstanceId,
          root.identity.renderScope
        )
      );
      if (
        current !== undefined &&
        isAuthoredRoot(current) &&
        getContentStorageIdentityKey(current.identity) ===
          getContentStorageIdentityKey(root.identity)
      ) {
        loadedRoots.set(getContentStorageIdentityKey(root.identity), current);
      }
    }
  }
  return [...loadedRoots.values()];
};

const waitForMaterializedPersistence = (
  roots: readonly MaterializedContentRoot[]
):
  | readonly MaterializedContentRoot[]
  | Promise<readonly MaterializedContentRoot[]> => {
  const pending = new Set(
    roots.flatMap((root) => {
      const queue = materializedPersistenceQueues.get(
        getCurrentQueueKey(
          getContentBlockRenderScopeKey(
            root.identity.blockInstanceId,
            root.identity.renderScope
          )
        )
      );
      return queue === undefined ? [] : [queue];
    })
  );
  if (pending.size === 0) {
    return getCurrentMaterializedRoots(roots);
  }
  return Promise.all(pending).then(() => getCurrentMaterializedRoots(roots));
};

const publishOptimisticStorageMutation = (
  result: BuilderRuntimeMutation
): boolean => {
  const changes = result.storageChanges ?? [];
  const blocker = getMaterializedContentSaveBlocker(changes);
  if (blocker !== undefined) {
    toast.error(blocker.message);
    return false;
  }
  publishPendingMaterializedContentChanges(changes);
  return true;
};

const rebaseMaterializedStorageChanges = (
  changes: readonly ContentStorageChange[],
  queuedKeys: ReadonlySet<string>
): Readonly<{
  changes: readonly ContentStorageChange[];
  advancedChanges: readonly ContentStorageChange[];
}> => {
  const roots = $activeMaterializedContentRoots.get();
  const getCurrentRoot = (
    root: ContentStorageChange["root"]
  ): Readonly<{
    root: ContentStorageChange["root"];
    advanced: boolean;
  }> => {
    const identity = root.identity;
    const scopeKey = getContentBlockRenderScopeKey(
      identity.blockInstanceId,
      identity.renderScope
    );
    const current = roots.get(scopeKey);
    return current === undefined ||
      queuedKeys.has(scopeKey) === false ||
      isSameMaterializedContentSource(identity, current.identity) === false
      ? { root, advanced: false }
      : {
          root: { type: "external", identity: current.identity },
          advanced:
            getContentStorageIdentityKey(current.identity) !==
            getContentStorageIdentityKey(identity),
        };
  };
  const advancedChanges: ContentStorageChange[] = [];
  const rebasedChanges = changes.map((change) => {
    const current = getCurrentRoot(change.root);
    const rebased = {
      ...change,
      root: current.root,
    };
    if (current.advanced) {
      advancedChanges.push(rebased);
    }
    return rebased;
  });
  return { changes: rebasedChanges, advancedChanges };
};

const persistRuntimeMutation = async <Mutation extends BuilderRuntimeMutation>(
  result: Mutation,
  plannedData: ReturnType<typeof getWebstudioData>,
  {
    allowIdentityReplanning = false,
    loadedRoots = [],
    rematerializesMaterializedIds = false,
  }: {
    allowIdentityReplanning?: boolean;
    loadedRoots?: readonly MaterializedMdxAuthoredContentRoot[];
    rematerializesMaterializedIds?: boolean;
  } = {}
): Promise<Mutation | undefined> => {
  const generation = getMaterializedContentGeneration();
  const abortSignal = getMaterializedContentAbortSignal();
  const storageChanges = result.storageChanges ?? [];
  const projectFirst =
    result.payload.length > 0 &&
    getRuntimeMutationPersistenceOrder(result) === "project-first";
  const identityRematerializationScopes = new Set(
    storageChanges
      .filter(
        (change) =>
          rematerializesMaterializedIds ||
          createsMaterializedInstanceIds(change)
      )
      .map((change) =>
        getGenerationQueueKey(generation, getMaterializedChangeScopeKey(change))
      )
  );
  for (const scopeKey of identityRematerializationScopes) {
    pendingIdentityRematerializationScopes.add(scopeKey);
    if (allowIdentityReplanning) {
      replannableIdentityRematerializationScopes.add(scopeKey);
    }
  }
  try {
    return await serializeMaterializedPersistence({
      changes: storageChanges,
      includesProjectStep: result.payload.length > 0,
      generation,
      abortSignal,
      persist: async (queuedKeys) => {
        if (generation !== getMaterializedContentGeneration()) {
          return;
        }
        const { changes: rebasedStorageChanges, advancedChanges } =
          rebaseMaterializedStorageChanges(storageChanges, queuedKeys);
        try {
          if (
            advancedChanges.length > 0 &&
            getMaterializedContentSaveBlocker(rebasedStorageChanges, {
              copySourceRoots: loadedRoots,
            }) === undefined
          ) {
            publishPendingMaterializedContentChanges(advancedChanges);
          }
          const saveResult = await saveMaterializedContentChanges(
            rebasedStorageChanges,
            {
              loadedRoots,
              projectStep:
                result.payload.length === 0
                  ? undefined
                  : {
                      order: projectFirst
                        ? ("before" as const)
                        : ("after" as const),
                      preflight: () =>
                        generation === getMaterializedContentGeneration() &&
                        hasSameBuilderStateStoreReferences(
                          plannedData,
                          getWebstudioData()
                        )
                          ? { status: "applied" as const }
                          : {
                              status: "blocked" as const,
                              message:
                                "The project changed before the content edit was saved.",
                            },
                      save: () => {
                        if (
                          generation !== getMaterializedContentGeneration() ||
                          hasSameBuilderStateStoreReferences(
                            plannedData,
                            getWebstudioData()
                          ) === false
                        ) {
                          return {
                            status: "blocked" as const,
                            message:
                              projectFirst === false
                                ? "The MDX files were saved, but the project changed before its step."
                                : "The project changed before the content edit was saved.",
                          };
                        }
                        createTransactionFromBuilderPatchPayload({
                          data: plannedData,
                          payload: result.payload,
                        });
                        return { status: "applied" as const };
                      },
                    },
            }
          );
          if (generation !== getMaterializedContentGeneration()) {
            return;
          }
          if (saveResult.status !== "applied") {
            failPendingMaterializedContentChanges(
              rebasedStorageChanges,
              saveResult.message
            );
            toast.error(saveResult.message);
            return;
          }
          return result;
        } catch (error) {
          if (generation !== getMaterializedContentGeneration()) {
            return;
          }
          const message = "The MDX file could not be saved.";
          failPendingMaterializedContentChanges(
            rebasedStorageChanges,
            message,
            {
              includeReady: true,
            }
          );
          toast.error(message);
          throw new Error(message, { cause: error });
        }
      },
    });
  } finally {
    for (const scopeKey of identityRematerializationScopes) {
      pendingIdentityRematerializationScopes.delete(scopeKey);
      if (allowIdentityReplanning) {
        replannableIdentityRematerializationScopes.delete(scopeKey);
      }
    }
  }
};

const commitRuntimeMutation = <Mutation extends BuilderRuntimeMutation>(
  result: Mutation,
  {
    returnPendingResult = false,
    plannedData = getWebstudioData(),
    rematerializesMaterializedIds = false,
  }: {
    returnPendingResult?: boolean;
    plannedData?: ReturnType<typeof getWebstudioData>;
    rematerializesMaterializedIds?: boolean;
  } = {}
): Mutation | undefined => {
  const pendingPersistenceMessage = getPendingPersistenceMessage(result);
  if (pendingPersistenceMessage !== undefined) {
    toast.error(pendingPersistenceMessage);
    return;
  }
  if (!result.storageChanges?.length) {
    createTransactionFromBuilderPatchPayload({
      data: plannedData,
      payload: result.payload,
    });
    return result;
  }
  const blocker = getMaterializedContentSaveBlocker(result.storageChanges);
  if (blocker !== undefined) {
    toast.error(blocker.message);
    return;
  }
  const loadedRoots = getLoadedMaterializedRoots(result.storageChanges);
  publishPendingMaterializedContentChanges(result.storageChanges);
  void persistRuntimeMutation(result, plannedData, {
    loadedRoots,
    rematerializesMaterializedIds,
  }).catch(() => undefined);
  return returnPendingResult ? result : undefined;
};

const commitRuntimeMutationAsync = async <
  Mutation extends BuilderRuntimeMutation,
>(
  result: Mutation,
  {
    allowIdentityReplanning = false,
    plannedData = getWebstudioData(),
    rematerializesMaterializedIds = false,
  }: {
    allowIdentityReplanning?: boolean;
    plannedData?: ReturnType<typeof getWebstudioData>;
    rematerializesMaterializedIds?: boolean;
  } = {}
): Promise<Mutation | undefined> => {
  const pendingPersistenceMessage = getPendingPersistenceMessage(result, {
    allowIdentityReplanning,
  });
  if (pendingPersistenceMessage !== undefined) {
    toast.error(pendingPersistenceMessage);
    return;
  }
  if (!result.storageChanges?.length) {
    return commitRuntimeMutation(result, { plannedData });
  }
  const blocker = getMaterializedContentSaveBlocker(result.storageChanges);
  if (blocker !== undefined) {
    toast.error(blocker.message);
    return;
  }
  const loadedRoots = getLoadedMaterializedRoots(result.storageChanges);
  publishPendingMaterializedContentChanges(result.storageChanges);
  return persistRuntimeMutation(result, plannedData, {
    allowIdentityReplanning,
    loadedRoots,
    rematerializesMaterializedIds,
  });
};

export const executeRuntimeMutation = <
  Id extends BuilderRuntimeMutationOperationId,
>({
  id,
  input,
  context,
  returnPendingResult = false,
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
  context?: RuntimeMutationContext;
  returnPendingResult?: boolean;
}): RuntimeMutationResult<Id> | undefined => {
  if (canCommitWebstudioData() === false) {
    return;
  }
  if (
    canEditMaterializedContent(
      context?.materializedContent ?? getSelectedMaterializedContent(),
      context?.materializedContent === undefined
    ) === false
  ) {
    return;
  }
  try {
    return commitRuntimeMutation(
      requireSynchronousResult(
        id,
        executeBuilderRuntimeOperation<RuntimeMutationResult<Id>>(
          createRuntimeMutationArgs({ id, input, context })
        )
      ),
      {
        returnPendingResult:
          returnPendingResult || id === "instances.updateTextTree",
        rematerializesMaterializedIds:
          rematerializesMaterializedInstanceIds(id),
      }
    );
  } catch (error) {
    const confirmation = getTemplateNameConfirmation(error);
    if (confirmation === undefined) {
      throw error;
    }
    $pendingTemplateNameConfirmation.set({
      operation: { id, input } as RuntimeMutationOperation,
      confirmation,
    });
    return;
  }
};

export const abortPendingTemplateNameConfirmation = () => {
  $pendingTemplateNameConfirmation.set(undefined);
};

export const confirmPendingTemplateNameChange = () => {
  const pending = $pendingTemplateNameConfirmation.get();
  if (pending === undefined) {
    return;
  }
  $pendingTemplateNameConfirmation.set(undefined);
  if ("operations" in pending) {
    const operations = pending.operations.map((operation, index) =>
      index === pending.operationIndex
        ? addTemplateNameConfirmation(operation, pending.confirmation)
        : operation
    );
    try {
      if (
        tryExecuteRuntimeMutationSequence(operations) &&
        operations.every(({ id }) => id === "instances.deleteBySelector")
      ) {
        clearInstanceSelection();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The template change could not be applied."
      );
    }
    return;
  }
  const operation = addTemplateNameConfirmation(
    pending.operation,
    pending.confirmation
  );
  let result: BuilderRuntimeMutation | undefined;
  try {
    result = executeRuntimeMutation(operation);
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "The template change could not be applied."
    );
    return;
  }
  if (result === undefined) {
    return;
  }
  if (operation.id === "instances.delete") {
    clearInstanceSelection();
  }
  if (
    operation.id === "instances.deleteBySelector" &&
    "instanceSelector" in result.result &&
    Array.isArray(result.result.instanceSelector) &&
    result.result.instanceSelector.every(
      (instanceId) => typeof instanceId === "string"
    )
  ) {
    selectInstance(result.result.instanceSelector);
  }
};

export const executeRuntimeMutationSequence = (
  operations: readonly RuntimeMutationOperation[]
): void => void tryExecuteRuntimeMutationSequence(operations);

export const tryExecuteRuntimeMutationSequence = (
  operations: readonly RuntimeMutationOperation[]
) => {
  if (canCommitWebstudioData() === false) {
    return false;
  }
  let materializedContent = getSelectedMaterializedContent();
  if (canEditMaterializedContent(materializedContent) === false) {
    return false;
  }
  const accumulator = createRuntimeMutationAccumulator(getWebstudioData());
  const storageChanges: ContentStorageChange[] = [];
  const persistenceOrders = new Set<
    NonNullable<BuilderRuntimeMutation["persistenceOrder"]>
  >();
  let rematerializesMaterializedIds = false;
  const results: Record<string, unknown>[] = [];
  for (const [operationIndex, { id, input }] of operations.entries()) {
    let mutation: BuilderRuntimeMutation;
    try {
      mutation = requireSynchronousResult(
        id,
        executeBuilderRuntimeOperation<BuilderRuntimeMutation>({
          id,
          state: accumulator.state,
          input,
          context: {
            ...getRuntimeMutationContext(),
            materializedContent,
          },
        })
      );
    } catch (error) {
      const confirmation = getTemplateNameConfirmation(error);
      if (confirmation === undefined) {
        throw error;
      }
      $pendingTemplateNameConfirmation.set({
        operations,
        operationIndex,
        confirmation,
      });
      return false;
    }
    const nextStorageChanges = mutation.storageChanges ?? [];
    if (rematerializesMaterializedInstanceIds(id)) {
      rematerializesMaterializedIds = true;
    }
    storageChanges.push(...nextStorageChanges);
    if (mutation.persistenceOrder !== undefined) {
      persistenceOrders.add(mutation.persistenceOrder);
    }
    results.push(
      accumulator.stage({
        ...mutation,
        storageChanges: undefined,
      })
    );
    if (nextStorageChanges.length > 0) {
      materializedContent = materializedContent.map((root) => {
        const rootChanges = nextStorageChanges.filter(
          (change) =>
            getMaterializedChangeScopeKey(change) ===
            getContentBlockRenderScopeKey(
              root.identity.blockInstanceId,
              root.identity.renderScope
            )
        );
        if (rootChanges.length === 0) {
          return root;
        }
        return applyMaterializedContentChanges(root, rootChanges);
      });
    }
  }
  if (persistenceOrders.size > 1) {
    throw new Error("Runtime mutation sequence has conflicting save orders.");
  }
  const accumulated = accumulator.complete({ results });
  const result = createRuntimeMutation({
    payload: accumulated.payload,
    result: accumulated.result,
    invalidatesNamespaces: accumulated.invalidatesNamespaces,
    storageChanges: storageChanges.length === 0 ? undefined : storageChanges,
    persistenceOrder: persistenceOrders.values().next().value,
  });
  return (
    commitRuntimeMutation(result, {
      returnPendingResult: true,
      rematerializesMaterializedIds,
    }) !== undefined
  );
};

export const executeRuntimeMutationAsync = async <
  Id extends BuilderRuntimeMutationOperationId,
>({
  id,
  input,
  context,
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
  context?: RuntimeMutationContext;
}): Promise<RuntimeMutationResult<Id> | undefined> => {
  if (canCommitWebstudioData() === false) {
    return;
  }
  if (
    canEditMaterializedContent(
      context?.materializedContent ?? getSelectedMaterializedContent(),
      context?.materializedContent === undefined
    ) === false
  ) {
    return;
  }
  const operationGeneration = getMaterializedContentGeneration();
  let operationContext = context;
  let operationInput = input;
  const materializedContentToReplan = rematerializesMaterializedInstanceIds(id)
    ? context?.materializedContent
    : undefined;
  const canReplanIdentity = materializedContentToReplan !== undefined;
  if (materializedContentToReplan !== undefined) {
    let materializedContent = materializedContentToReplan;
    while (true) {
      if (areMaterializedContentSourcesCurrent(materializedContent) === false) {
        toast.error(
          "The MDX content source changed before the edit was saved."
        );
        return;
      }
      if (hasBlockingIdentityRematerializationForRoots(materializedContent)) {
        toast.error(pendingIdentityRematerializationMessage);
        return;
      }
      const pending = waitForMaterializedPersistence(materializedContent);
      if (pending instanceof Promise === false) {
        materializedContent = pending;
        break;
      }
      const previousMaterializedContent = materializedContent;
      const optimisticResult = requireSynchronousResult(
        id,
        executeBuilderRuntimeOperation<RuntimeMutationResult<Id>>(
          createRuntimeMutationArgs({
            id,
            input: operationInput,
            context: { ...context, materializedContent },
          })
        )
      );
      const pendingPersistenceMessage = getPendingPersistenceMessage(
        optimisticResult,
        { allowIdentityReplanning: true }
      );
      if (pendingPersistenceMessage !== undefined) {
        toast.error(pendingPersistenceMessage);
        return;
      }
      if (publishOptimisticStorageMutation(optimisticResult) === false) {
        return;
      }
      materializedContent = await pending;
      if (operationGeneration !== getMaterializedContentGeneration()) {
        return;
      }
      operationInput = rebaseMaterializedOperationInput(
        id,
        operationInput,
        previousMaterializedContent,
        materializedContent
      );
    }
    operationContext = {
      ...context,
      materializedContent,
    };
  }
  const plannedData = getWebstudioData();
  const execution = executeBuilderRuntimeOperation<RuntimeMutationResult<Id>>(
    createRuntimeMutationArgs({
      id,
      input: operationInput,
      context: operationContext,
      state: plannedData,
    })
  );
  const result = execution instanceof Promise ? await execution : execution;
  if (
    operationGeneration !== getMaterializedContentGeneration() ||
    hasSameBuilderStateStoreReferences(plannedData, getWebstudioData()) ===
      false
  ) {
    return;
  }
  return commitRuntimeMutationAsync(result, {
    allowIdentityReplanning: canReplanIdentity,
    plannedData,
    rematerializesMaterializedIds: rematerializesMaterializedInstanceIds(id),
  });
};

const defaultProjectSettings = { meta: {}, compiler: {} };

export const getWebstudioData = () => {
  const data = readBuilderStateStores();
  const { pages } = data;
  if (pages === undefined) {
    throw Error(`Cannot get webstudio data with empty pages`);
  }
  const projectSettings = data.projectSettings ?? defaultProjectSettings;
  return {
    ...data,
    pages,
    projectSettings,
  };
};

export const getRuntimeWebstudioData = () => ({
  ...getWebstudioData(),
  assets: $runtimeAssets.get(),
  breakpoints: $runtimeBreakpoints.get(),
  dataSources: $runtimeDataSources.get(),
  instances: $runtimeInstances.get(),
  props: $runtimeProps.get(),
  resources: $runtimeResources.get(),
  styles: $runtimeStyles.get(),
  styleSources: $runtimeStyleSources.get(),
  styleSourceSelections: $runtimeStyleSourceSelections.get(),
});
