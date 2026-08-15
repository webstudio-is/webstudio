import {
  ContentBlockSourceAuthorityRequiredError,
  builderRuntimeContext,
  computeExpression,
  createMdxAssetEditingSession,
  getContentBlockSessionErrorCode,
  getContentBlockSessionMessage,
  getContentBlockSessionSource,
  getContentStorageIdentityKey,
  persistPreparedContentBlockLifecycle,
  prepareContentBlockConnect,
  prepareContentBlockDisconnect,
  prepareContentBlockSwitch,
  recoverContentBlockSession,
  isContentBlockSessionSourceCommitted,
  type ContentBlockSourceAuthority,
  type ContentBlockPersistenceResult,
  type ContentStorageChange,
  type MaterializedContentRoot,
  type MdxAssetEditingSessionState,
} from "@webstudio-is/project-build/runtime";
import {
  getContentBlockSource,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import { createBuilderHttpAssetContentRepository } from "~/builder/shared/assets/builder-mdx-content-repository.client";
import {
  $variableValuesByInstanceSelector,
  getInstanceKeyWithRoot,
} from "~/shared/nano-states";
import { $project, readBuilderStateStores } from "~/shared/sync/data-stores";
import { getAssetContentBridge } from "~/shared/asset-content-bridge.client";
import { createTransactionFromBuilderPatchPayload } from "~/shared/sync/builder-patch";
import { getWebstudioData } from "~/shared/instance-utils/data";
import { invalidateAssets } from "~/shared/resources";
import {
  publishMaterializedContentSessionState,
  registerContentStorageSaver,
  removeMaterializedContentRoot,
  registerContentBlockPresentationActions,
} from "~/shared/content-block-content";

export type ContentBlockSourceControllerResult =
  | Readonly<{
      status: "applied";
      state?: MdxAssetEditingSessionState;
    }>
  | Readonly<{ status: "requires-authority" }>
  | Readonly<{
      status: "partial";
      code: "content-source-partial-persistence";
      message: string;
      persistence: ContentBlockPersistenceResult;
    }>
  | Readonly<{ status: "blocked"; code?: string; message: string }>;

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
}>;

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

const hasSameBuilderState = (
  left: ReturnType<typeof readBuilderStateStores>,
  right: ReturnType<typeof readBuilderStateStores>
) =>
  Object.keys(left).every(
    (namespace) =>
      left[namespace as keyof typeof left] ===
      right[namespace as keyof typeof right]
  );

// Builder retains a long-lived session for canvas projection.
// Lifecycle persistence and recovery policy stay in project-build so the
// generated application operations and this stateful adapter make the same
// authorization, conflict, and serial persistence decisions.
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
}: ContentBlockSourceControllerDependencies) => {
  let currentSessionKey: string | undefined;
  let openVersion = 0;
  let disposed = false;
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
      return {
        status: "blocked",
        message: "The MDX Asset session is closed.",
      };
    }
    const persisted = await persistPreparedContentBlockLifecycle({
      prepared,
      session,
      commitProjectPayload: (payload) => commitProjectPayload([...payload]),
      canCommitProjectPayload: () =>
        hasSameBuilderState(expectedState, getState()),
    });
    if (persisted.status !== "complete") {
      const failedStep = persisted.persistence.steps.find(
        ({ status }) => status === "failed"
      );
      if (persisted.state !== undefined && failedStep?.type === "asset") {
        publishSessionState?.(persisted.state);
      }
      if (
        persisted.persistence.steps.some(
          ({ type, status }) => type === "asset" && status === "saved"
        )
      ) {
        invalidate();
      }
      if (persisted.status === "partial") {
        return {
          status: "partial",
          code: "content-source-partial-persistence",
          message:
            "Some content changes were saved. Retry the unfinished steps.",
          persistence: persisted.persistence,
        };
      }
      return {
        status: "blocked",
        code: failedStep?.code,
        message:
          failedStep?.message ?? "The content changes could not be saved.",
      };
    }
    if (disposed) {
      return { status: "applied", state: persisted.state };
    }
    if (persisted.state !== undefined) {
      publishSessionState?.(persisted.state);
      if ("key" in persisted.state) {
        currentSessionKey = persisted.state.key;
      }
      if (persisted.state.status === "saved") {
        publishMaterializedRoot?.(persisted.state.root);
      }
    }
    if (prepared.storageWrites.length > 0) {
      invalidate();
    }
    if (prepared.action === "disconnect") {
      currentSessionKey = undefined;
      removeMaterializedRoot?.();
    }
    return { status: "applied", state: persisted.state };
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
    let pending: Awaited<ReturnType<typeof session.queueSave>>;
    try {
      pending = await session.queueSave({
        key,
        changes,
      });
    } catch (error) {
      throw error;
    }
    if (disposed === false && currentSessionKey === key) {
      publishSessionState?.(pending);
    }
    if (pending.status !== "pending" && pending.status !== "saved") {
      return {
        status: "blocked",
        code: getContentBlockSessionErrorCode(pending),
        message: getContentBlockSessionMessage(pending),
      };
    }
    if (disposed) {
      if (pending.status === "pending") {
        session.cancel(key);
      }
      return {
        status: "blocked",
        message: "The MDX Asset editing session was closed.",
      };
    }
    const expectedSource = getContentBlockSessionSource(pending);
    if (expectedSource === undefined) {
      return {
        status: "blocked",
        message: "The updated MDX source is unavailable.",
      };
    }
    let saved: Awaited<ReturnType<typeof session.flush>>;
    try {
      saved = pending.status === "pending" ? await session.flush(key) : pending;
    } catch (error) {
      throw error;
    }
    if (disposed === false && currentSessionKey === key) {
      publishSessionState?.(saved);
    }
    const committed = isContentBlockSessionSourceCommitted({
      state: saved,
      source: expectedSource,
    });
    const committedWithProjectionError =
      committed && saved.status === "recoverable";
    if (committed === false) {
      return {
        status: "blocked",
        code: getContentBlockSessionErrorCode(saved),
        message: getContentBlockSessionMessage(saved),
      };
    }
    if (disposed) {
      return {
        status: "blocked",
        message: "The MDX Asset editing session was closed.",
      };
    }
    const savedCurrentSource = currentSessionKey === key;
    if (savedCurrentSource && "key" in saved) {
      currentSessionKey = saved.key;
    }
    if (saved.status === "saved" && savedCurrentSource) {
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

  const preflightStorageChanges = async (
    changes: readonly ContentStorageChange[]
  ): Promise<ContentBlockSourceControllerResult> => {
    if (disposed || currentSessionKey === undefined) {
      return { status: "blocked", message: "The MDX Asset is not loaded." };
    }
    const preflight = await session.preflightSave({
      key: currentSessionKey,
      changes,
    });
    return preflight.status === "ready"
      ? { status: "applied" }
      : { status: "blocked", message: preflight.reason };
  };

  const retry = async (): Promise<ContentBlockSourceControllerResult> => {
    if (disposed) {
      return { status: "blocked", message: "The MDX Asset session is closed." };
    }
    const current =
      currentSessionKey === undefined
        ? undefined
        : session.get(currentSessionKey);
    if (current === undefined || currentSessionKey === undefined) {
      const source = getConfiguredSource({
        state: getState(),
        blockInstanceId,
      });
      if (source === undefined) {
        return {
          status: "blocked",
          message: "The MDX source is disconnected.",
        };
      }
      const state = await open(source);
      return state.status === "saved" || state.status === "pending"
        ? { status: "applied", state }
        : {
            status: "blocked",
            message: getContentBlockSessionMessage(state),
          };
    }
    const key = currentSessionKey;
    const source = getConfiguredSource({ state: getState(), blockInstanceId });
    const recovered = await recoverContentBlockSession({
      session,
      state: current,
      action: "retry",
      reopen:
        source === undefined
          ? undefined
          : () =>
              session.open({
                blockInstanceId,
                source,
                renderScope,
                state: getState(),
                projectId,
              }),
    });
    if (disposed || currentSessionKey !== key) {
      return { status: "blocked", message: "The MDX Asset session changed." };
    }
    publishSessionState?.(recovered.state);
    if (recovered.status === "blocked") {
      return {
        status: "blocked",
        code: recovered.code,
        message: recovered.message,
      };
    }
    if (recovered.state.status === "saved") {
      currentSessionKey = recovered.state.key;
      publishMaterializedRoot?.(recovered.state.root);
    }
    if (recovered.changedAsset) {
      invalidate();
    }
    return { status: "applied", state: recovered.state };
  };

  const reloadRemote =
    async (): Promise<ContentBlockSourceControllerResult> => {
      if (disposed || currentSessionKey === undefined) {
        return { status: "blocked", message: "The MDX Asset is not loaded." };
      }
      const key = currentSessionKey;
      const current = session.get(key);
      if (current === undefined) {
        return { status: "blocked", message: "The MDX Asset is not loaded." };
      }
      const recovered = await recoverContentBlockSession({
        session,
        state: current,
        action: "reload-remote",
      });
      if (disposed || currentSessionKey !== key) {
        return { status: "blocked", message: "The MDX Asset session changed." };
      }
      const state = recovered.state;
      if ("key" in state) {
        currentSessionKey = state.key;
      }
      publishSessionState?.(state);
      if (recovered.status === "complete" && state.status === "saved") {
        publishMaterializedRoot?.(state.root);
        invalidate();
      }
      return recovered.status === "complete"
        ? { status: "applied", state }
        : {
            status: "blocked",
            code: recovered.code,
            message: recovered.message,
          };
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
    preflightStorageChanges,
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
    authorizeAsset: ({ assetId, operation, identity }) =>
      getAssetContentBridge().authorize({
        projectId,
        assetId,
        identityAssetId: identity?.assetId,
        operation,
      }),
    resolveExpressionAssetId: ({ expression, renderScope: scope }) => {
      const values = $variableValuesByInstanceSelector.get();
      let selector: unknown;
      try {
        selector = JSON.parse(scope);
      } catch {
        selector = undefined;
      }
      const variables =
        values.get(scope) ??
        (Array.isArray(selector) &&
        selector.every((instanceId) => typeof instanceId === "string")
          ? values.get(getInstanceKeyWithRoot(selector))
          : undefined);
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
    removeMaterializedRoot: () =>
      removeMaterializedContentRoot({ blockInstanceId, renderScope }),
  });
  const unregisterSaver = registerContentStorageSaver({
    blockInstanceId,
    renderScope,
    preflight: async (changes) => {
      const result = await controller.preflightStorageChanges(changes);
      return result.status === "applied"
        ? result
        : {
            status: "blocked",
            message:
              result.status === "requires-authority"
                ? "Saving MDX content cannot require content authority."
                : result.message,
          };
    },
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
