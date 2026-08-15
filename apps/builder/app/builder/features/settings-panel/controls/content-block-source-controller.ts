import {
  ContentBlockSourceAuthorityRequiredError,
  builderRuntimeContext,
  computeExpression,
  createMdxAssetEditingSession,
  getContentStorageIdentityKey,
  getMdxContentPersistencePlan,
  prepareContentBlockConnect,
  prepareContentBlockDisconnect,
  prepareContentBlockSwitch,
  type ContentBlockSourceAuthority,
  type ContentStorageChange,
  type MaterializedContentRoot,
  type MdxAssetEditingSessionState,
} from "@webstudio-is/project-build/runtime";
import {
  getContentBlockSource,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import { createBuilderHttpAssetContentRepository } from "~/builder/shared/assets/mdx-content-repository";
import {
  $authPermit,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import {
  $assets,
  $project,
  readBuilderStateStores,
} from "~/shared/sync/data-stores";
import { createTransactionFromBuilderPatchPayload } from "~/shared/sync/builder-patch";
import { getWebstudioData } from "~/shared/instance-utils/data";
import { invalidateAssets } from "~/shared/resources";
import {
  publishMaterializedContentSessionState,
  registerContentStorageSaver,
  removeMaterializedContentRoot,
  registerContentBlockPresentationActions,
} from "~/shared/content-block-content";
import {
  beginMdxAssetHistory,
  disposeMdxAssetHistory,
  dropMdxAssetHistory,
  recordMdxAssetHistory,
} from "~/shared/content-block-history-bridge";

export type ContentBlockSourceControllerResult =
  | Readonly<{
      status: "applied";
      state?: MdxAssetEditingSessionState;
    }>
  | Readonly<{ status: "requires-authority" }>
  | Readonly<{ status: "blocked"; message: string }>;

type ContentBlockSourceControllerDependencies = Readonly<{
  blockInstanceId: string;
  renderScope: string;
  projectId: string;
  session: ReturnType<typeof createMdxAssetEditingSession>;
  getState: typeof readBuilderStateStores;
  commitProjectPayload: (
    payload: Parameters<
      typeof createTransactionFromBuilderPatchPayload
    >[0]["payload"]
  ) => void;
  invalidateAssets: () => void;
  publishMaterializedRoot?: (root: MaterializedContentRoot) => void;
  publishSessionState?: (state: MdxAssetEditingSessionState) => void;
  removeMaterializedRoot?: () => void;
  recordStorageHistory?: typeof recordMdxAssetHistory;
  beginStorageHistory?: typeof beginMdxAssetHistory;
  dropStorageHistory?: typeof dropMdxAssetHistory;
  disposeStorageHistory?: typeof disposeMdxAssetHistory;
}>;

const getEditableSource = (state: MdxAssetEditingSessionState | undefined) =>
  state !== undefined && "localSource" in state
    ? state.localSource
    : state !== undefined && "source" in state
      ? state.source
      : undefined;

const getConfiguredSource = ({
  state,
  blockInstanceId,
}: {
  state: ReturnType<typeof readBuilderStateStores>;
  blockInstanceId: string;
}) => {
  return getContentBlockSource({
    blockInstanceId,
    props: state.props.values(),
  });
};

const blockedMessage = {
  "atomic-project-and-asset-unavailable":
    "Replacing file content while changing the Content Block source requires atomic project and Asset persistence, which is not available yet.",
  "atomic-multiple-assets-unavailable":
    "This change requires atomic updates to multiple Assets, which are not available yet.",
} as const;

const getStorageSaveError = (state: MdxAssetEditingSessionState) =>
  state.status === "conflicting"
    ? "The MDX file changed remotely. Reload it before saving."
    : state.status === "recoverable"
      ? "The MDX file still could not be rendered."
      : state.status === "failed" && "localSource" in state
        ? "The MDX file could not be saved."
        : "The MDX file could not be loaded.";

const hasSameBuilderState = (
  left: ReturnType<typeof readBuilderStateStores>,
  right: ReturnType<typeof readBuilderStateStores>
) =>
  Object.keys(left).every(
    (namespace) =>
      left[namespace as keyof typeof left] ===
      right[namespace as keyof typeof right]
  );

export const createContentBlockSourceController = ({
  blockInstanceId,
  renderScope,
  projectId,
  session,
  getState,
  commitProjectPayload,
  invalidateAssets: invalidate,
  publishMaterializedRoot,
  publishSessionState,
  removeMaterializedRoot,
  recordStorageHistory,
  beginStorageHistory,
  dropStorageHistory,
  disposeStorageHistory,
}: ContentBlockSourceControllerDependencies) => {
  let currentSessionKey: string | undefined;
  let openVersion = 0;
  let disposed = false;
  const storageHistoryIds = new Set<string>();
  const isCurrentSessionKey = (key: string) => {
    if (disposed || currentSessionKey === undefined) {
      return false;
    }
    const candidate = session.get(key);
    const current = session.get(currentSessionKey);
    return (
      candidate !== undefined &&
      current !== undefined &&
      "key" in candidate &&
      "key" in current &&
      candidate.key === current.key
    );
  };

  const open = async (source: ContentBlockSource) => {
    const version = ++openVersion;
    const state = await session.open({
      blockInstanceId,
      source,
      renderScope,
      state: getState(),
      projectId,
    });
    if (disposed === false && version === openVersion) {
      if ("key" in state) {
        currentSessionKey = state.key;
      }
      publishSessionState?.(state);
      if ("root" in state && state.status === "saved") {
        publishMaterializedRoot?.(state.root);
      }
    }
    return state;
  };

  const discardBlockedPreparation = (
    state: MdxAssetEditingSessionState | undefined
  ) => {
    if (state?.status === "pending") {
      session.cancel(state.key);
    }
  };

  const applyPrepared = async (
    prepared: Awaited<
      ReturnType<
        | typeof prepareContentBlockConnect
        | typeof prepareContentBlockDisconnect
        | typeof prepareContentBlockSwitch
      >
    >,
    expectedState: ReturnType<typeof readBuilderStateStores>
  ): Promise<ContentBlockSourceControllerResult> => {
    if (disposed) {
      discardBlockedPreparation(prepared.sourceState);
      return { status: "blocked", message: "The MDX Asset session is closed." };
    }
    const plan = getMdxContentPersistencePlan(prepared);
    if (plan.status === "blocked") {
      discardBlockedPreparation(prepared.sourceState);
      return { status: "blocked", message: blockedMessage[plan.reason] };
    }
    if (plan.mode === "single-asset") {
      const sourceState = prepared.sourceState;
      if (sourceState === undefined || !("key" in sourceState)) {
        return { status: "blocked", message: "The MDX Asset is not loaded." };
      }
      const saved = await session.flush(sourceState.key);
      if (disposed) {
        return {
          status: "blocked",
          message: "The MDX Asset session is closed.",
        };
      }
      publishSessionState?.(saved);
      if (saved.status !== "saved") {
        return {
          status: "blocked",
          message: getStorageSaveError(saved),
        };
      }
      currentSessionKey = saved.key;
      publishMaterializedRoot?.(saved.root);
      invalidate();
      return { status: "applied", state: saved };
    }
    if (plan.mode === "project") {
      if (hasSameBuilderState(expectedState, getState()) === false) {
        return {
          status: "blocked",
          message: "The project changed while preparing this source update.",
        };
      }
      commitProjectPayload([...prepared.projectPayload]);
    }
    if (prepared.action === "disconnect") {
      currentSessionKey = undefined;
      removeMaterializedRoot?.();
    } else if (
      prepared.sourceState !== undefined &&
      "key" in prepared.sourceState
    ) {
      currentSessionKey = prepared.sourceState.key;
    }
    return { status: "applied", state: prepared.sourceState };
  };

  const requestSource = async ({
    source,
    authority,
  }: {
    source: ContentBlockSource;
    authority?: ContentBlockSourceAuthority;
  }): Promise<ContentBlockSourceControllerResult> => {
    if (disposed) {
      return { status: "blocked", message: "The MDX Asset session is closed." };
    }
    const state = getState();
    const configuredSource = getConfiguredSource({ state, blockInstanceId });
    try {
      if (configuredSource === undefined) {
        return await applyPrepared(
          await prepareContentBlockConnect({
            state,
            blockInstanceId,
            source,
            renderScope,
            projectId,
            authority,
            session,
            context: builderRuntimeContext,
          }),
          state
        );
      }
      if (currentSessionKey === undefined) {
        const current = await open(configuredSource);
        if (!("key" in current) || !("root" in current)) {
          return {
            status: "blocked",
            message: "The current MDX file could not be loaded.",
          };
        }
      }
      const currentKey = currentSessionKey;
      if (currentKey === undefined) {
        return { status: "blocked", message: "The MDX Asset is not loaded." };
      }
      return await applyPrepared(
        await prepareContentBlockSwitch({
          state,
          blockInstanceId,
          currentSessionKey: currentKey,
          source,
          renderScope,
          projectId,
          authority,
          session,
          context: builderRuntimeContext,
        }),
        state
      );
    } catch (error) {
      if (error instanceof ContentBlockSourceAuthorityRequiredError) {
        return { status: "requires-authority" };
      }
      throw error;
    }
  };

  const disconnect = async (): Promise<ContentBlockSourceControllerResult> => {
    if (disposed) {
      return { status: "blocked", message: "The MDX Asset session is closed." };
    }
    const state = getState();
    const source = getConfiguredSource({ state, blockInstanceId });
    if (source !== undefined && currentSessionKey === undefined) {
      const current = await open(source);
      if (!("key" in current) || !("root" in current)) {
        return {
          status: "blocked",
          message: "The current MDX file could not be loaded.",
        };
      }
    }
    return await applyPrepared(
      await prepareContentBlockDisconnect({
        state,
        blockInstanceId,
        currentSessionKey,
        renderScope,
        session,
        context: builderRuntimeContext,
      }),
      state
    );
  };

  const saveStorageChanges = async (
    changes: readonly ContentStorageChange[]
  ): Promise<ContentBlockSourceControllerResult> => {
    if (disposed || currentSessionKey === undefined) {
      return { status: "blocked", message: "The MDX Asset is not loaded." };
    }
    const key = currentSessionKey;
    const beforeSource = getEditableSource(session.get(key));
    if (beforeSource === undefined) {
      return {
        status: "blocked",
        message: "The current MDX source cannot be added to history.",
      };
    }
    const historyId =
      recordStorageHistory === undefined ? undefined : beginStorageHistory?.();
    if (historyId !== undefined) {
      storageHistoryIds.add(historyId);
    }
    const dropPendingHistory = () => {
      if (historyId !== undefined && storageHistoryIds.delete(historyId)) {
        dropStorageHistory?.(historyId);
      }
    };
    let pending: Awaited<ReturnType<typeof session.queueSave>>;
    try {
      pending = await session.queueSave({
        key,
        changes,
      });
    } catch (error) {
      dropPendingHistory();
      throw error;
    }
    if (disposed === false && currentSessionKey === key) {
      publishSessionState?.(pending);
    }
    if (pending.status !== "pending" && pending.status !== "saved") {
      dropPendingHistory();
      return {
        status: "blocked",
        message: getStorageSaveError(pending),
      };
    }
    if (disposed) {
      dropPendingHistory();
      if (pending.status === "pending") {
        session.cancel(key);
      }
      return {
        status: "blocked",
        message: "The MDX Asset editing session was closed.",
      };
    }
    const afterSource = getEditableSource(pending);
    if (afterSource === undefined) {
      dropPendingHistory();
      return {
        status: "blocked",
        message: "The updated MDX source cannot be added to history.",
      };
    }
    let saved: Awaited<ReturnType<typeof session.flush>>;
    try {
      saved = pending.status === "pending" ? await session.flush(key) : pending;
    } catch (error) {
      dropPendingHistory();
      throw error;
    }
    if (disposed === false && currentSessionKey === key) {
      publishSessionState?.(saved);
    }
    const committedWithProjectionError =
      saved.status === "recoverable" && saved.committedSource === afterSource;
    if (saved.status !== "saved" && committedWithProjectionError === false) {
      dropPendingHistory();
      return {
        status: "blocked",
        message: getStorageSaveError(saved),
      };
    }
    if (disposed) {
      dropPendingHistory();
      return {
        status: "blocked",
        message: "The MDX Asset editing session was closed.",
      };
    }
    const historyResult = recordStorageHistory?.({
      id: historyId,
      state: getState(),
      mutation: { payload: [] },
      session,
      key,
      beforeSource,
      afterSource,
      isCurrent: () => isCurrentSessionKey(key),
      publishState: (historyState) => {
        if (
          historyState.status === "saved" ||
          (historyState.status === "recoverable" &&
            historyState.committedSource !== undefined)
        ) {
          invalidate();
        }
        if (isCurrentSessionKey(key) === false) {
          return;
        }
        publishSessionState?.(historyState);
        if (historyState.status === "saved") {
          publishMaterializedRoot?.(historyState.root);
        }
      },
    });
    if (historyId !== undefined) {
      storageHistoryIds.delete(historyId);
    }
    if (historyResult?.status === "blocked") {
      return historyResult;
    }
    if (saved.status === "saved" && currentSessionKey === key) {
      currentSessionKey = saved.key;
      publishMaterializedRoot?.(saved.root);
    }
    if (
      (saved.status === "saved" && currentSessionKey === saved.key) ||
      committedWithProjectionError
    ) {
      invalidate();
    }
    return { status: "applied", state: saved };
  };

  const retry = async (): Promise<ContentBlockSourceControllerResult> => {
    if (disposed) {
      return { status: "blocked", message: "The MDX Asset session is closed." };
    }
    const current =
      currentSessionKey === undefined
        ? undefined
        : session.get(currentSessionKey);
    if (current?.status === "conflicting") {
      return {
        status: "blocked",
        message: "Reload the remote MDX file before retrying this change.",
      };
    }
    if (
      currentSessionKey !== undefined &&
      current?.status === "failed" &&
      "localSource" in current
    ) {
      const key = currentSessionKey;
      const state = await session.retry(key);
      if (disposed || currentSessionKey !== key) {
        return { status: "blocked", message: "The MDX Asset session changed." };
      }
      publishSessionState?.(state);
      if (state.status !== "saved") {
        return { status: "blocked", message: getStorageSaveError(state) };
      }
      currentSessionKey = state.key;
      publishMaterializedRoot?.(state.root);
      invalidate();
      return { status: "applied", state };
    }
    const source = getConfiguredSource({ state: getState(), blockInstanceId });
    if (source === undefined) {
      return { status: "blocked", message: "The MDX source is disconnected." };
    }
    const state = await open(source);
    return state.status === "saved" || state.status === "pending"
      ? { status: "applied", state }
      : { status: "blocked", message: getStorageSaveError(state) };
  };

  const reloadRemote =
    async (): Promise<ContentBlockSourceControllerResult> => {
      if (disposed || currentSessionKey === undefined) {
        return { status: "blocked", message: "The MDX Asset is not loaded." };
      }
      const key = currentSessionKey;
      const state = await session.reloadRemote(key);
      if (disposed || currentSessionKey !== key) {
        return { status: "blocked", message: "The MDX Asset session changed." };
      }
      if ("key" in state) {
        currentSessionKey = state.key;
      }
      publishSessionState?.(state);
      if (state.status === "saved") {
        publishMaterializedRoot?.(state.root);
        invalidate();
      }
      return state.status === "saved"
        ? { status: "applied", state }
        : { status: "blocked", message: getStorageSaveError(state) };
    };

  const copyUnsavedSource = () =>
    currentSessionKey === undefined
      ? undefined
      : session.copyUnsavedSource(currentSessionKey);

  const isCurrent = ({ identity }: MaterializedContentRoot) => {
    const state =
      currentSessionKey === undefined
        ? undefined
        : session.get(currentSessionKey);
    return (
      state !== undefined &&
      "identity" in state &&
      getContentStorageIdentityKey(state.identity) ===
        getContentStorageIdentityKey(identity)
    );
  };

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    openVersion += 1;
    currentSessionKey = undefined;
    disposeStorageHistory?.(session);
    for (const entryId of storageHistoryIds) {
      dropStorageHistory?.(entryId);
    }
    storageHistoryIds.clear();
    for (const state of session.list()) {
      if (state.status === "pending") {
        session.cancel(state.key);
      }
    }
  };

  return {
    open,
    requestSource,
    disconnect,
    saveStorageChanges,
    retry,
    reloadRemote,
    copyUnsavedSource,
    isCurrent,
    dispose,
  };
};

type BuilderContentBlockSourceController = ReturnType<
  typeof createContentBlockSourceController
>;

type BuilderControllerEntry = {
  controller: BuilderContentBlockSourceController;
  unregisterSaver: () => void;
  unregisterPresentationActions: () => void;
  references: number;
};

const builderControllers = new Map<string, BuilderControllerEntry>();

const acquireBuilderController = ({
  controllerKey,
  entry,
  blockInstanceId,
  renderScope,
}: {
  controllerKey: string;
  entry: BuilderControllerEntry;
  blockInstanceId: string;
  renderScope: string;
}) => {
  let released = false;
  return {
    ...entry.controller,
    dispose: () => {
      if (released) {
        return;
      }
      released = true;
      entry.references -= 1;
      if (entry.references !== 0) {
        return;
      }
      builderControllers.delete(controllerKey);
      entry.unregisterSaver();
      entry.unregisterPresentationActions();
      entry.controller.dispose();
      removeMaterializedContentRoot({ blockInstanceId, renderScope });
    },
  };
};

export const createBuilderContentBlockSourceController = ({
  blockInstanceId,
  renderScope,
  projectId,
}: {
  blockInstanceId: string;
  renderScope: string;
  projectId: string;
}) => {
  const controllerKey = JSON.stringify([
    projectId,
    blockInstanceId,
    renderScope,
  ]);
  const existing = builderControllers.get(controllerKey);
  if (existing !== undefined) {
    existing.references += 1;
    return acquireBuilderController({
      controllerKey,
      entry: existing,
      blockInstanceId,
      renderScope,
    });
  }
  const repository = createBuilderHttpAssetContentRepository({ projectId });
  const session = createMdxAssetEditingSession({
    repository,
    authorizeAsset: ({ assetId, operation, identity }) => {
      const project = $project.get();
      const asset = $assets.get().get(assetId);
      return (
        project?.id === projectId &&
        asset?.projectId === projectId &&
        (identity === undefined || identity.assetId === assetId) &&
        (operation === "read" || $authPermit.get() !== "view")
      );
    },
    resolveExpressionAssetId: ({ expression, renderScope: scope }) => {
      const variables = $variableValuesByInstanceSelector.get().get(scope);
      const value = computeExpression(expression, variables ?? new Map());
      return typeof value === "string" && value !== "" ? value : undefined;
    },
  });
  const controller = createContentBlockSourceController({
    blockInstanceId,
    renderScope,
    projectId,
    session,
    getState: readBuilderStateStores,
    commitProjectPayload: (payload) =>
      createTransactionFromBuilderPatchPayload({
        data: getWebstudioData(),
        payload,
      }),
    invalidateAssets,
    publishSessionState: (state) => {
      if ($project.get()?.id === projectId) {
        publishMaterializedContentSessionState({
          blockInstanceId,
          renderScope,
          state,
        });
      }
    },
    recordStorageHistory: recordMdxAssetHistory,
    beginStorageHistory: beginMdxAssetHistory,
    dropStorageHistory: dropMdxAssetHistory,
    disposeStorageHistory: disposeMdxAssetHistory,
    removeMaterializedRoot: () =>
      removeMaterializedContentRoot({ blockInstanceId, renderScope }),
  });
  const unregisterSaver = registerContentStorageSaver({
    blockInstanceId,
    renderScope,
    isCurrent: controller.isCurrent,
    save: async (changes) => {
      const result = await controller.saveStorageChanges(changes);
      const saveResult =
        result.status === "requires-authority"
          ? {
              status: "blocked" as const,
              message: "Saving MDX content cannot require content authority.",
            }
          : result;
      return saveResult;
    },
  });
  const toStorageResult = (result: ContentBlockSourceControllerResult) =>
    result.status === "applied"
      ? ({ status: "applied" } as const)
      : {
          status: "blocked" as const,
          message:
            result.status === "blocked"
              ? result.message
              : "The MDX operation requires content authority.",
        };
  const unregisterPresentationActions = registerContentBlockPresentationActions(
    {
      blockInstanceId,
      renderScope,
      actions: {
        retry: async () => toStorageResult(await controller.retry()),
        reloadRemote: async () =>
          toStorageResult(await controller.reloadRemote()),
        copyUnsavedSource: controller.copyUnsavedSource,
      },
    }
  );
  const entry = {
    controller,
    unregisterSaver,
    unregisterPresentationActions,
    references: 1,
  };
  builderControllers.set(controllerKey, entry);
  return acquireBuilderController({
    controllerKey,
    entry,
    blockInstanceId,
    renderScope,
  });
};
