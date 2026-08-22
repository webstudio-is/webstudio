import {
  builderRuntimeContext,
  ContentBlockSourceRevisionConflictError,
  computeExpression,
  createContentBlockBodyRemoval,
  createMdxAssetEditingSession,
  getContentBlockSessionErrorCode,
  getContentBlockSessionMessage,
  getContentBlockSessionSource,
  getContentStorageIdentityKey,
  persistPreparedContentBlockLifecycle,
  prepareContentBlockConnect,
  prepareContentBlockDisconnect,
  prepareContentBlockSwitch,
  isContentBlockSessionSourceCommitted,
  type ContentBlockPersistenceResult,
  type ContentStorageChange,
  type MaterializedContentRoot,
  type MdxAssetEditingSessionState,
  type PreparedContentBlockSourceLifecycle,
} from "@webstudio-is/project-build/runtime";
import { serializeMdxDocument } from "@webstudio-is/content-engine/mdx";
import {
  getContentBlockSource,
  isEqualContentBlockSource,
  type ContentBlockDiagnostic,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import { createBuilderHttpAssetContentRepository } from "~/builder/shared/assets/builder-mdx-content-repository.client";
import {
  $variableValuesByInstanceSelector,
  getInstanceKeyWithRoot,
} from "~/shared/nano-states";
import {
  $project,
  hasSameBuilderStateStoreReferences,
  readBuilderStateStores,
} from "~/shared/sync/data-stores";
import { getAssetContentBridge } from "~/shared/asset-content-bridge.client";
import { createTransactionFromBuilderPatchPayload } from "~/shared/sync/builder-patch";
import { getWebstudioData } from "~/shared/instance-utils/data";
import { invalidateAssets } from "~/shared/resources";
import {
  publishMaterializedContentSessionState,
  registerContentStorageSaver,
  removeMaterializedContentRoot,
} from "~/shared/content-block-content";

export type ContentBlockSourceControllerResult =
  | Readonly<{
      status: "applied";
      state?: MdxAssetEditingSessionState;
    }>
  | Readonly<{ status: "requires-confirmation" }>
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
  onRevisionConflict?: (message: string) => void;
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
  onRevisionConflict,
}: ContentBlockSourceControllerDependencies) => {
  let currentSessionKey: string | undefined;
  let openVersion = 0;
  let disposed = false;
  let pendingConnectConfirmation:
    | Readonly<{
        source: ContentBlockSource;
        state: ReturnType<typeof readBuilderStateStores>;
      }>
    | undefined;
  let frontmatterSaveQueue = Promise.resolve();
  const getBlockedSessionResult = (
    state: MdxAssetEditingSessionState
  ): ContentBlockSourceControllerResult => {
    const code = getContentBlockSessionErrorCode(state);
    const message = getContentBlockSessionMessage(state);
    if (code === "content-source-write-conflict") {
      onRevisionConflict?.(message);
    }
    return { status: "blocked", code, message };
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
      if (state.status === "saved") {
        const currentState = getState();
        const configuredSource = getConfiguredSource({
          state: currentState,
          blockInstanceId,
        });
        if (isEqualContentBlockSource(configuredSource, source)) {
          const removal = createContentBlockBodyRemoval({
            state: currentState,
            blockInstanceId,
          });
          if (removal.hasBody) {
            commitProjectPayload([...removal.payload]);
          }
        }
      }
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
    prepared: PreparedContentBlockSourceLifecycle,
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
      commitProjectPayload: (payload) => commitProjectPayload([...payload]),
      canCommitProjectPayload: () =>
        disposed === false &&
        hasSameBuilderStateStoreReferences(expectedState, getState()),
    });
    if (persisted.status !== "complete") {
      if (disposed) {
        return {
          status: "blocked",
          message: "The MDX Asset session is closed.",
        };
      }
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
    if (prepared.action === "disconnect") {
      currentSessionKey = undefined;
      removeMaterializedRoot?.();
    }
    return { status: "applied", state: persisted.state };
  };

  const requestSource = async ({
    source,
    confirmed = false,
  }: {
    source: ContentBlockSource;
    confirmed?: boolean;
  }): Promise<ContentBlockSourceControllerResult> => {
    if (disposed) {
      return { status: "blocked", message: "The MDX Asset session is closed." };
    }
    const state = getState();
    const configuredSource = getConfiguredSource({ state, blockInstanceId });
    if (configuredSource === undefined) {
      const pending = pendingConnectConfirmation;
      if (
        confirmed &&
        pending !== undefined &&
        isEqualContentBlockSource(pending.source, source) &&
        hasSameBuilderStateStoreReferences(pending.state, state)
      ) {
        pendingConnectConfirmation = undefined;
        return await applyPrepared(
          await prepareContentBlockConnect({
            state,
            blockInstanceId,
            source,
            renderScope,
            projectId,
            session,
            context: builderRuntimeContext,
          }),
          state
        );
      }
      const prepared = await prepareContentBlockConnect({
        state,
        blockInstanceId,
        source,
        renderScope,
        projectId,
        session,
        context: builderRuntimeContext,
      });
      if (prepared.requiresConfirmation) {
        pendingConnectConfirmation = { source, state };
        return { status: "requires-confirmation" };
      }
      pendingConnectConfirmation = undefined;
      return await applyPrepared(prepared, state);
    }
    pendingConnectConfirmation = undefined;
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
        session,
        context: builderRuntimeContext,
      }),
      state
    );
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
    try {
      return await applyPrepared(
        await prepareContentBlockDisconnect({
          state,
          blockInstanceId,
          currentSessionKey,
          renderScope,
          projectId,
          session,
          context: builderRuntimeContext,
        }),
        state
      );
    } catch (error) {
      if (error instanceof ContentBlockSourceRevisionConflictError) {
        publishSessionState?.(error.state);
        return getBlockedSessionResult(error.state);
      }
      throw error;
    }
  };

  const saveStorageChanges = async (
    changes: readonly ContentStorageChange[]
  ): Promise<ContentBlockSourceControllerResult> => {
    if (disposed || currentSessionKey === undefined) {
      return { status: "blocked", message: "The MDX Asset is not loaded." };
    }
    const key = currentSessionKey;
    const pending = await session.queueSave({ key, changes });
    if (disposed === false && currentSessionKey === key) {
      publishSessionState?.(pending);
    }
    if (pending.status !== "pending" && pending.status !== "saved") {
      return getBlockedSessionResult(pending);
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
    const saved =
      pending.status === "pending" ? await session.flush(key) : pending;
    if (disposed === false && currentSessionKey === key) {
      publishSessionState?.(saved);
    }
    if (disposed) {
      return {
        status: "blocked",
        message: "The MDX Asset editing session was closed.",
      };
    }
    const committed = isContentBlockSessionSourceCommitted({
      state: saved,
      source: expectedSource,
    });
    const committedWithProjectionError =
      committed && saved.status === "recoverable";
    if (committed === false) {
      return getBlockedSessionResult(saved);
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

  const persistFrontmatter = async (
    properties: Readonly<Record<string, unknown>>
  ): Promise<ContentBlockSourceControllerResult> => {
    if (disposed || currentSessionKey === undefined) {
      return { status: "blocked", message: "The MDX Asset is not loaded." };
    }
    const key = currentSessionKey;
    const current = session.get(key);
    if (current?.status !== "saved") {
      return {
        status: "blocked",
        message: `Frontmatter cannot be saved while the MDX Asset session is ${current?.status ?? "not loaded"}.`,
      };
    }
    const source = serializeMdxDocument({
      ...current.root.document,
      frontmatter: { ...current.root.document.frontmatter, properties },
    });
    const persisted = await session.persistSourceReplacement({
      key,
      expectedSource: current.source,
      source,
      isCurrent: () => disposed === false && currentSessionKey === key,
    });
    const state = persisted.state;
    if (disposed === false && currentSessionKey === key) {
      publishSessionState?.(state);
    }
    if (disposed) {
      return {
        status: "blocked",
        message: "The MDX Asset editing session was closed.",
      };
    }
    if (persisted.status === "blocked") {
      return getBlockedSessionResult(state);
    }
    if (!isContentBlockSessionSourceCommitted({ state, source })) {
      return getBlockedSessionResult(state);
    }
    if ("key" in state) {
      currentSessionKey = state.key;
    }
    if (state.status === "saved") {
      publishMaterializedRoot?.(state.root);
    }
    invalidate();
    return { status: "applied", state };
  };

  const saveFrontmatter = (
    properties: Readonly<Record<string, unknown>>
  ): Promise<ContentBlockSourceControllerResult> => {
    const saving = frontmatterSaveQueue.then(() =>
      persistFrontmatter(properties)
    );
    frontmatterSaveQueue = saving.then(
      () => undefined,
      () => undefined
    );
    return saving;
  };

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

  const getSessionState = () =>
    currentSessionKey === undefined
      ? undefined
      : session.get(currentSessionKey);

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
    saveFrontmatter,
    isCurrent,
    getSessionState,
    dispose,
  };
};

type BuilderContentBlockSourceController = ReturnType<
  typeof createContentBlockSourceController
>;

type BuilderControllerEntry = {
  controller: BuilderContentBlockSourceController;
  unregisterSaver: () => void;
  references: number;
};

const builderControllers = new Map<string, BuilderControllerEntry>();

const acquireBuilderController = ({
  controllerKey,
  entry,
  blockInstanceId,
  renderScope,
  onMaterializedRootRemoved,
}: {
  controllerKey: string;
  entry: BuilderControllerEntry;
  blockInstanceId: string;
  renderScope: string;
  onMaterializedRootRemoved?: () => void;
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
      entry.controller.dispose();
      removeMaterializedContentRoot({ blockInstanceId, renderScope });
      onMaterializedRootRemoved?.();
    },
  };
};

export const createBuilderContentBlockSourceController = ({
  blockInstanceId,
  renderScope,
  projectId,
  onMaterializedRoot,
  onMaterializedRootRemoved,
}: {
  blockInstanceId: string;
  renderScope: string;
  projectId: string;
  onMaterializedRoot?: (
    root: MaterializedContentRoot,
    diagnostics: readonly ContentBlockDiagnostic[]
  ) => void;
  onMaterializedRootRemoved?: () => void;
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
      onMaterializedRootRemoved,
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
        if ("root" in state) {
          onMaterializedRoot?.(state.root, state.diagnostics);
        }
      }
    },
    removeMaterializedRoot: () => {
      removeMaterializedContentRoot({ blockInstanceId, renderScope });
      onMaterializedRootRemoved?.();
    },
    onRevisionConflict: (message) =>
      getAssetContentBridge().requireReload(message),
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
              result.status === "requires-confirmation"
                ? "Saving MDX content cannot require source confirmation."
                : result.message,
          };
    },
    isCurrent: controller.isCurrent,
    save: async (changes) => {
      const result = await controller.saveStorageChanges(changes);
      const saveResult =
        result.status === "requires-confirmation"
          ? {
              status: "blocked" as const,
              message: "Saving MDX content cannot require source confirmation.",
            }
          : result;
      return saveResult;
    },
  });
  const entry = {
    controller,
    unregisterSaver,
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
