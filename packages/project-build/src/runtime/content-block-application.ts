import {
  blockTemplateComponent,
  getContentBlockSource,
  type ContentBlockSource,
} from "@webstudio-is/sdk";
import {
  createConfirmationToken,
  validateConfirmationToken,
} from "../confirmation-token";
import type { BuilderPatchChange } from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import type { ContentArtifactV1 } from "@webstudio-is/content-engine";
import { parseJsonExpression } from "@webstudio-is/expression";
import { resolvePublishedMdxAssetCandidates } from "../content-database";
import {
  ContentBlockSourceAuthorityRequiredError,
  prepareContentBlockConnect,
  prepareContentBlockDisconnect,
  prepareContentBlockSwitch,
  type ContentBlockSourceAuthority,
  type PreparedContentBlockSourceLifecycle,
} from "./content-block-source-lifecycle";
import type {
  BuilderRuntimeContext,
  ContentBlockPersistenceResult,
  ContentBlockPersistenceStep,
  ContentBlockSourceInspection,
} from "./context";
import type { MdxAssetEditingSessionState } from "./mdx-asset-session";
import type { PendingMdxContentStorageWrite } from "./mdx-storage-adapter";
import {
  getRuntimeMutationPersistenceOrder,
  type BuilderRuntimeMutation,
  type ContentStorageChange,
} from "./mutation";
import { getContentStorageIdentityKey } from "./content-storage";
import { getSourceBackedBlockTemplateContext } from "./block";
import {
  planMdxTemplateMigration,
  validateMdxTemplateMigrationConfirmation,
  type MdxTemplateMigration,
  type MdxTemplateMigrationDiagnostic,
} from "./mdx-template-migration";
import {
  executeBuilderRuntimeOperation,
  getBuilderRuntimeOperation,
  type BuilderRuntimeOperationId,
} from "./registry";

export type MdxAssetEditingSession = Parameters<
  typeof prepareContentBlockConnect
>[0]["session"] &
  Readonly<{
    queueSave: (input: {
      key: string;
      changes: readonly ContentStorageChange[];
    }) => Promise<MdxAssetEditingSessionState>;
    preflightSave: (input: {
      key: string;
      changes: readonly ContentStorageChange[];
    }) => Promise<
      | Readonly<{ status: "ready" }>
      | Readonly<{ status: "blocked"; reason: string }>
    >;
    flush: (key: string) => Promise<MdxAssetEditingSessionState>;
    retry: (key: string) => Promise<MdxAssetEditingSessionState>;
    reloadRemote: (key: string) => Promise<MdxAssetEditingSessionState>;
    copyUnsavedSource: (key: string) => string | undefined;
    list: () => readonly MdxAssetEditingSessionState[];
    persistSourceReplacement: (input: {
      key: string;
      expectedSource: string;
      source: string;
    }) => Promise<
      | Readonly<{ status: "applied"; state: MdxAssetEditingSessionState }>
      | Readonly<{ status: "blocked"; reason: string }>
    >;
  }>;

export type ContentBlockApplicationErrorCode =
  | "content-source-not-configured"
  | "content-source-not-loaded"
  | "content-source-authority-required"
  | "content-source-confirmation-required"
  | "content-source-stale-confirmation"
  | "content-source-session-failed"
  | "content-source-write-conflict"
  | "content-source-authorization-failed"
  | "content-source-partial-persistence";

export type ContentBlockApplicationResult<Result = unknown> =
  | Readonly<{ status: "complete"; result: Result }>
  | Readonly<{
      status: "confirmation-required";
      code: "content-source-confirmation-required";
      confirmationToken: string;
      confirmationExpiresAt: string;
      result: Result;
    }>
  | Readonly<{
      status: "blocked";
      code: ContentBlockApplicationErrorCode;
      message: string;
      result?: Result;
    }>
  | Readonly<{
      status: "partial";
      code: "content-source-partial-persistence";
      message: string;
      result: Result;
    }>;

const lifecycleConfirmationTtlMs = 5 * 60_000;

const getConfiguredSource = (state: BuilderState, blockInstanceId: string) =>
  getContentBlockSource({
    blockInstanceId,
    props: state.props?.values() ?? [],
  });

export const getContentBlockSessionErrorCode = (
  state: MdxAssetEditingSessionState
): ContentBlockApplicationErrorCode => {
  if (state.status === "conflicting") {
    return "content-source-write-conflict";
  }
  if (
    state.diagnostics.some(
      (diagnostic) => diagnostic.code === "authorization-failed"
    )
  ) {
    return "content-source-authorization-failed";
  }
  return "content-source-session-failed";
};

export const getContentBlockSessionMessage = (
  state: MdxAssetEditingSessionState
) =>
  "error" in state
    ? state.error.message
    : state.status === "conflicting"
      ? "The MDX Asset changed remotely"
      : `The MDX Asset session is ${state.status}`;

export const getContentBlockSessionSource = (
  state: MdxAssetEditingSessionState | undefined
) =>
  state !== undefined && "localSource" in state
    ? state.localSource
    : state !== undefined && "source" in state
      ? state.source
      : undefined;

export const isContentBlockSessionSourceCommitted = ({
  state,
  source,
}: {
  state: MdxAssetEditingSessionState;
  source: string;
}) =>
  (state.status === "saved" && state.source === source) ||
  (state.status === "recoverable" && state.committedSource === source);

export type { ContentBlockPersistenceResult, ContentBlockPersistenceStep };

export type ContentBlockPersistencePlanStep = Readonly<{
  type: "asset" | "project";
  root?: PendingMdxContentStorageWrite["root"]["identity"];
  preflight: () => Promise<
    | Readonly<{ status: "ready" }>
    | Readonly<{ status: "failed"; code: string; message: string }>
  >;
  persist: () => Promise<
    | Readonly<{ status: "saved" }>
    | Readonly<{ status: "failed"; code: string; message: string }>
  >;
}>;

export const executeContentBlockPersistencePlan = async (
  plan: readonly ContentBlockPersistencePlanStep[]
): Promise<ContentBlockPersistenceResult> => {
  for (const [index, planned] of plan.entries()) {
    let preflight: Awaited<ReturnType<typeof planned.preflight>>;
    try {
      preflight = await planned.preflight();
    } catch {
      preflight = {
        status: "failed",
        code: "content-source-session-failed",
        message: "Content persistence preflight failed",
      };
    }
    if (preflight.status === "ready") {
      continue;
    }
    return {
      status: "failed",
      steps: plan.map((step, stepIndex) => ({
        type: step.type,
        status: stepIndex === index ? "failed" : "not-attempted",
        ...(step.root === undefined ? {} : { root: step.root }),
        ...(stepIndex === index
          ? { code: preflight.code, message: preflight.message }
          : {}),
      })),
      retry: {
        replan: true,
        roots: plan.flatMap(({ type, root }) =>
          type === "asset" && root !== undefined ? [root] : []
        ),
        project: plan.some(({ type }) => type === "project"),
      },
    };
  }
  const steps: ContentBlockPersistenceStep[] = [];
  for (const [index, planned] of plan.entries()) {
    let persisted: Awaited<ReturnType<typeof planned.persist>>;
    try {
      persisted = await planned.persist();
    } catch {
      persisted = {
        status: "failed",
        code: "content-source-session-failed",
        message: "Content persistence failed",
      };
    }
    steps.push({
      type: planned.type,
      status: persisted.status,
      ...(planned.root === undefined ? {} : { root: planned.root }),
      ...(persisted.status === "failed"
        ? { code: persisted.code, message: persisted.message }
        : {}),
    });
    if (persisted.status === "saved") {
      continue;
    }
    for (const remaining of plan.slice(index + 1)) {
      steps.push({
        type: remaining.type,
        status: "not-attempted",
        ...(remaining.root === undefined ? {} : { root: remaining.root }),
      });
    }
    return {
      status: index === 0 ? "failed" : "partial",
      steps,
      retry: {
        replan: true,
        roots: plan
          .slice(index)
          .flatMap(({ type, root }) =>
            type === "asset" && root !== undefined ? [root] : []
          ),
        project: plan.slice(index).some(({ type }) => type === "project"),
      },
    };
  }
  return {
    status: "complete",
    steps,
    retry: { replan: true, roots: [], project: false },
  };
};

type ContentBlockSemanticMutation<Result extends Record<string, unknown>> =
  BuilderRuntimeMutation<Result> &
    Readonly<{ persistence?: ContentBlockPersistenceResult }>;

export const persistPreparedContentBlockLifecycle = async ({
  prepared,
  session,
  commitProjectPayload,
  canCommitProjectPayload = () => true,
}: {
  prepared: PreparedContentBlockSourceLifecycle;
  session: MdxAssetEditingSession;
  commitProjectPayload?: (
    payload: readonly BuilderPatchChange[]
  ) => void | Promise<void>;
  canCommitProjectPayload?: () => boolean;
}): Promise<
  Readonly<{
    status: "complete" | "partial" | "failed";
    state?: MdxAssetEditingSessionState;
    persistence: ContentBlockPersistenceResult;
  }>
> => {
  let state = prepared.sourceState;
  const owners: Array<{ key: string; expectedSource: string } | undefined> = [];
  const assetPlan = prepared.storageWrites.map((write, index) => ({
    type: "asset" as const,
    root: write.root.identity,
    preflight: async () => {
      const identityKey = getContentStorageIdentityKey(write.root.identity);
      const owner = session
        .list()
        .find(
          (candidate) =>
            "identity" in candidate &&
            getContentStorageIdentityKey(candidate.identity) === identityKey
        );
      const expectedSource = getContentBlockSessionSource(owner);
      if (
        owner === undefined ||
        !("key" in owner) ||
        expectedSource === undefined
      ) {
        return {
          status: "failed" as const,
          code: "content-source-not-loaded",
          message: "The MDX Asset is not loaded",
        };
      }
      const preflight = await session.prepareSourceReplacement({
        key: owner.key,
        expectedSource,
        source: write.source,
      });
      if (preflight.status === "blocked") {
        state = preflight.state;
        return {
          status: "failed" as const,
          code: getContentBlockSessionErrorCode(preflight.state),
          message: getContentBlockSessionMessage(preflight.state),
        };
      }
      owners[index] = { key: owner.key, expectedSource };
      return { status: "ready" as const };
    },
    persist: async () => {
      const owner = owners[index];
      if (owner === undefined) {
        return {
          status: "failed" as const,
          code: "content-source-session-failed",
          message: "The MDX Asset persistence plan is stale",
        };
      }
      const persisted = await session.persistSourceReplacement({
        key: owner.key,
        expectedSource: owner.expectedSource,
        source: write.source,
      });
      state = persisted.state;
      return persisted.status === "applied"
        ? { status: "saved" as const }
        : {
            status: "failed" as const,
            code: getContentBlockSessionErrorCode(persisted.state),
            message: getContentBlockSessionMessage(persisted.state),
          };
    },
  }));
  const projectPlan =
    prepared.projectPayload.length === 0
      ? []
      : [
          {
            type: "project" as const,
            preflight: async () =>
              canCommitProjectPayload() && commitProjectPayload !== undefined
                ? { status: "ready" as const }
                : {
                    status: "failed" as const,
                    code: "content-source-session-failed",
                    message:
                      commitProjectPayload === undefined
                        ? "Project persistence is not available"
                        : "The project changed while preparing this source update.",
                  },
            persist: async () => {
              if (canCommitProjectPayload() === false) {
                return {
                  status: "failed" as const,
                  code: "content-source-session-failed",
                  message: "The project changed before its persistence step.",
                };
              }
              if (commitProjectPayload === undefined) {
                return {
                  status: "failed" as const,
                  code: "content-source-session-failed",
                  message: "Project persistence is not available",
                };
              }
              try {
                await commitProjectPayload(prepared.projectPayload);
                return { status: "saved" as const };
              } catch (error) {
                return {
                  status: "failed" as const,
                  code: "content-source-partial-persistence",
                  message:
                    error instanceof Error
                      ? error.message
                      : "Project persistence failed",
                };
              }
            },
          },
        ];
  const persistence = await executeContentBlockPersistencePlan([
    ...assetPlan,
    ...projectPlan,
  ]);
  return {
    status: persistence.status,
    state,
    persistence,
  };
};

export const recoverContentBlockSession = async ({
  session,
  state,
  action,
  dryRun = false,
  reopen,
}: {
  session: MdxAssetEditingSession;
  state: MdxAssetEditingSessionState;
  action: "retry" | "reload-remote" | "copy-unsaved-mdx";
  dryRun?: boolean;
  reopen?: () => Promise<MdxAssetEditingSessionState>;
}): Promise<
  | Readonly<{
      status: "complete";
      state: MdxAssetEditingSessionState;
      source?: string;
      changedAsset: boolean;
    }>
  | Readonly<{
      status: "blocked";
      code: ContentBlockApplicationErrorCode;
      message: string;
      state: MdxAssetEditingSessionState;
    }>
> => {
  if (action === "copy-unsaved-mdx") {
    const source =
      "key" in state ? session.copyUnsavedSource(state.key) : undefined;
    return source === undefined
      ? {
          status: "blocked",
          code: "content-source-session-failed",
          message: "The MDX Asset session has no unsaved local source",
          state,
        }
      : { status: "complete", state, source, changedAsset: false };
  }
  if (dryRun) {
    return { status: "complete", state, changedAsset: false };
  }
  if (!("key" in state)) {
    return {
      status: "blocked",
      code: "content-source-not-loaded",
      message: "The MDX Asset is not loaded",
      state,
    };
  }
  let next: MdxAssetEditingSessionState;
  if (action === "retry") {
    if (state.status === "failed" && "localSource" in state) {
      next = await session.retry(state.key);
    } else if (state.status === "recoverable" && reopen !== undefined) {
      next = await reopen();
    } else {
      return {
        status: "blocked",
        code: "content-source-session-failed",
        message: `Retry is not available while the MDX Asset session is ${state.status}`,
        state,
      };
    }
  } else {
    if (state.status !== "conflicting") {
      return {
        status: "blocked",
        code: "content-source-session-failed",
        message: `Remote reload is not available while the MDX Asset session is ${state.status}`,
        state,
      };
    }
    next = await session.reloadRemote(state.key);
  }
  const committedRetry =
    action === "retry" &&
    "localSource" in state &&
    isContentBlockSessionSourceCommitted({
      state: next,
      source: state.localSource,
    });
  return next.status === "saved" || committedRetry
    ? {
        status: "complete",
        state: next,
        changedAsset: action === "reload-remote" || committedRetry,
      }
    : {
        status: "blocked",
        code: getContentBlockSessionErrorCode(next),
        message: getContentBlockSessionMessage(next),
        state: next,
      };
};

export const persistContentBlockStorageChanges = async ({
  session,
  key,
  changes,
  publishState,
}: {
  session: MdxAssetEditingSession;
  key: string;
  changes: readonly ContentStorageChange[];
  publishState?: (state: MdxAssetEditingSessionState) => void;
}): Promise<
  | Readonly<{
      status: "complete";
      state: MdxAssetEditingSessionState;
    }>
  | Readonly<{
      status: "blocked";
      code: ContentBlockApplicationErrorCode;
      message: string;
      state: MdxAssetEditingSessionState;
    }>
> => {
  const queued = await session.queueSave({ key, changes });
  publishState?.(queued);
  const expectedSource = getContentBlockSessionSource(queued);
  const saved =
    queued.status === "pending" ? await session.flush(queued.key) : queued;
  if (saved !== queued) {
    publishState?.(saved);
  }
  return expectedSource !== undefined &&
    isContentBlockSessionSourceCommitted({
      state: saved,
      source: expectedSource,
    })
    ? { status: "complete", state: saved }
    : {
        status: "blocked",
        code: getContentBlockSessionErrorCode(saved),
        message: getContentBlockSessionMessage(saved),
        state: saved,
      };
};

const groupExternalStorageChanges = (
  changes: readonly ContentStorageChange[]
) => {
  const groups = new Map<
    string,
    {
      identity: Extract<
        ContentStorageChange["root"],
        { type: "external" }
      >["identity"];
      changes: ContentStorageChange[];
    }
  >();
  for (const change of changes) {
    if (change.root.type !== "external") {
      continue;
    }
    const key = getContentStorageIdentityKey(change.root.identity);
    const group = groups.get(key) ?? {
      identity: change.root.identity,
      changes: [],
    };
    group.changes.push(change);
    groups.set(key, group);
  }
  return [...groups.values()];
};

export const preflightContentBlockStorageChanges = async ({
  session,
  changes,
}: {
  session: MdxAssetEditingSession;
  changes: readonly ContentStorageChange[];
}): Promise<
  | Readonly<{ status: "ready" }>
  | Readonly<{
      status: "failed";
      code: ContentBlockApplicationErrorCode;
      message: string;
      persistence: ContentBlockPersistenceResult;
    }>
> => {
  const groups = groupExternalStorageChanges(changes);
  for (const [index, group] of groups.entries()) {
    const identityKey = getContentStorageIdentityKey(group.identity);
    const owner = session
      .list()
      .find(
        (state) =>
          "identity" in state &&
          getContentStorageIdentityKey(state.identity) === identityKey
      );
    const preflight =
      owner !== undefined && "key" in owner
        ? await session.preflightSave({
            key: owner.key,
            changes: group.changes,
          })
        : {
            status: "blocked" as const,
            reason: "The exact MDX Asset render scope is not loaded",
          };
    if (preflight.status === "ready") {
      continue;
    }
    const persistence: ContentBlockPersistenceResult = {
      status: "failed",
      steps: groups.map((candidate, candidateIndex) => ({
        type: "asset" as const,
        status:
          candidateIndex === index
            ? ("failed" as const)
            : ("not-attempted" as const),
        root: candidate.identity,
        ...(candidateIndex === index
          ? {
              code: "content-source-session-failed",
              message: preflight.reason,
            }
          : {}),
      })),
      retry: {
        replan: true,
        roots: groups.map(({ identity }) => identity),
        project: false,
      },
    };
    return {
      status: "failed",
      code: "content-source-session-failed",
      message: preflight.reason,
      persistence,
    };
  }
  return { status: "ready" };
};

export const persistContentBlockStorageChangesSerially = async ({
  session,
  changes,
  publishState,
  projectStep,
  persistenceOrder = "storage-first",
}: {
  session: MdxAssetEditingSession;
  changes: readonly ContentStorageChange[];
  publishState?: (state: MdxAssetEditingSessionState) => void;
  projectStep?: ContentBlockPersistencePlanStep;
  persistenceOrder?: "storage-first" | "project-first";
}): Promise<ContentBlockPersistenceResult> => {
  const groups = groupExternalStorageChanges(changes);
  const assetPlan = groups.map((group) => ({
    type: "asset" as const,
    root: group.identity,
    preflight: async () => {
      const identityKey = getContentStorageIdentityKey(group.identity);
      const owner = session
        .list()
        .find(
          (state) =>
            "identity" in state &&
            getContentStorageIdentityKey(state.identity) === identityKey
        );
      if (owner === undefined || !("key" in owner)) {
        return {
          status: "failed" as const,
          code: "content-source-not-loaded",
          message: "The exact MDX Asset render scope is not loaded",
        };
      }
      const preflight = await session.preflightSave({
        key: owner.key,
        changes: group.changes,
      });
      return preflight.status === "ready"
        ? preflight
        : {
            status: "failed" as const,
            code: "content-source-session-failed",
            message: preflight.reason,
          };
    },
    persist: async () => {
      const identityKey = getContentStorageIdentityKey(group.identity);
      const owner = session
        .list()
        .find(
          (state) =>
            "identity" in state &&
            getContentStorageIdentityKey(state.identity) === identityKey
        );
      if (owner === undefined || !("key" in owner)) {
        return {
          status: "failed" as const,
          code: "content-source-not-loaded",
          message: "The exact MDX Asset render scope is not loaded",
        };
      }
      const persisted = await persistContentBlockStorageChanges({
        session,
        key: owner.key,
        changes: group.changes,
        publishState,
      });
      return persisted.status === "complete"
        ? { status: "saved" as const }
        : {
            status: "failed" as const,
            code: persisted.code,
            message: persisted.message,
          };
    },
  }));
  return executeContentBlockPersistencePlan(
    projectStep === undefined
      ? assetPlan
      : persistenceOrder === "project-first"
        ? [projectStep, ...assetPlan]
        : [...assetPlan, projectStep]
  );
};

const getLifecycleConfirmationPayload = ({
  projectId,
  projectVersion,
  prepared,
  blockInstanceId,
  renderScope,
  source,
  authority,
}: {
  projectId: string;
  projectVersion?: number;
  prepared: PreparedContentBlockSourceLifecycle;
  blockInstanceId: string;
  renderScope: string;
  source?: ContentBlockSource;
  authority?: ContentBlockSourceAuthority;
}) => ({
  operation: `content-block-${prepared.action}`,
  projectId,
  projectVersion,
  blockInstanceId,
  renderScope,
  source,
  authority,
  changesProject: prepared.projectPayload.length > 0,
  storageWrites: prepared.storageWrites.map((write) => ({
    identity: write.root.identity,
    expectedContentRef: write.root.identity.contentRef,
    expectedRevision: write.expectedRevision,
    source: write.source,
  })),
});

export type ContentBlockLifecyclePlan = Readonly<{
  action: PreparedContentBlockSourceLifecycle["action"];
  changesProject: boolean;
  storageWrites: readonly Readonly<{
    identity: PendingMdxContentStorageWrite["root"]["identity"];
    expectedRevision: string;
  }>[];
  diagnostics: PreparedContentBlockSourceLifecycle["diagnostics"];
  persistenceOrder: PreparedContentBlockSourceLifecycle["persistenceOrder"];
  persistence?: ContentBlockPersistenceResult;
}>;

const serializeLifecyclePlan = (
  prepared: PreparedContentBlockSourceLifecycle
): ContentBlockLifecyclePlan => ({
  action: prepared.action,
  changesProject: prepared.projectPayload.length > 0,
  storageWrites: prepared.storageWrites.map((write) => ({
    identity: write.root.identity,
    expectedRevision: write.expectedRevision,
  })),
  diagnostics: prepared.diagnostics,
  persistenceOrder: prepared.persistenceOrder,
});

export const createContentBlockApplicationOperations = ({
  projectId,
  session,
  getState,
  getProjectVersion,
  commitProjectPayload,
  migrationContentArtifact,
  context,
}: {
  projectId: string;
  session: MdxAssetEditingSession;
  getState: () => BuilderState;
  getProjectVersion?: () => number | undefined;
  commitProjectPayload?: (
    payload: readonly BuilderPatchChange[]
  ) => void | Promise<void>;
  migrationContentArtifact?: ContentArtifactV1;
  context: BuilderRuntimeContext;
}) => {
  const activeKeys = new Map<string, string>();
  const scopeKey = (blockInstanceId: string, renderScope: string) =>
    JSON.stringify([blockInstanceId, renderScope]);
  const publishSession = (state: MdxAssetEditingSessionState) => {
    if ("identity" in state && "key" in state) {
      activeKeys.set(
        scopeKey(state.identity.blockInstanceId, state.identity.renderScope),
        state.key
      );
    }
    return state;
  };
  const getActiveState = (blockInstanceId: string, renderScope: string) => {
    const key = activeKeys.get(scopeKey(blockInstanceId, renderScope));
    return key === undefined ? undefined : session.get(key);
  };

  const inspectSource = async ({
    blockInstanceId,
    renderScope,
    load = true,
    variables,
  }: {
    blockInstanceId: string;
    renderScope: string;
    load?: boolean;
    variables?: Readonly<Record<string, unknown>>;
  }): Promise<ContentBlockSourceInspection> => {
    const state = getState();
    const configuredSource = getConfiguredSource(state, blockInstanceId);
    let sourceState = getActiveState(blockInstanceId, renderScope);
    if (sourceState === undefined && configuredSource !== undefined && load) {
      sourceState = publishSession(
        await session.open({
          blockInstanceId,
          source: configuredSource,
          renderScope,
          state,
          projectId,
          variables,
        })
      );
    }
    const diagnostics = sourceState?.diagnostics ?? [];
    const canEdit =
      sourceState?.status === "saved" || sourceState?.status === "pending";
    const repairRoutes: ContentBlockSourceInspection["repairRoutes"][number][] =
      [];
    if (sourceState !== undefined && "identity" in sourceState) {
      repairRoutes.push("open-file");
    }
    if (sourceState?.status === "failed") {
      repairRoutes.push("retry");
    }
    if (sourceState?.status === "conflicting") {
      repairRoutes.push("reload-remote");
    }
    if (sourceState !== undefined && "localSource" in sourceState) {
      repairRoutes.push("copy-unsaved-mdx");
    }
    if (configuredSource !== undefined) {
      repairRoutes.push("disconnect-with-copy");
    }
    return {
      blockInstanceId,
      renderScope,
      configuredSource,
      resolvedIdentity:
        sourceState !== undefined && "identity" in sourceState
          ? sourceState.identity
          : undefined,
      sessionStatus: sourceState?.status ?? "disconnected",
      pending: sourceState?.status === "pending",
      diagnostics,
      capabilities: {
        canConnect: configuredSource === undefined,
        canSwitch: configuredSource !== undefined,
        canDisconnectWithCopy: configuredSource !== undefined && canEdit,
        canEdit,
        canRetry: sourceState?.status === "failed",
        canReloadRemote: sourceState?.status === "conflicting",
        canCopyUnsavedSource:
          sourceState !== undefined && "localSource" in sourceState,
      },
      repairRoutes,
    };
  };

  const prepareLifecycle = async ({
    action,
    blockInstanceId,
    renderScope,
    source,
    authority,
    variables,
  }: {
    action: "connect" | "switch" | "disconnect";
    blockInstanceId: string;
    renderScope: string;
    source?: ContentBlockSource;
    authority?: ContentBlockSourceAuthority;
    variables?: Readonly<Record<string, unknown>>;
  }) => {
    const state = getState();
    if (action === "connect") {
      if (source === undefined) {
        throw new Error("Connect requires a Content Block source");
      }
      return await prepareContentBlockConnect({
        state,
        blockInstanceId,
        source,
        renderScope,
        projectId,
        authority,
        session,
        context,
        variables,
      });
    }
    let active = getActiveState(blockInstanceId, renderScope);
    if (active === undefined) {
      await inspectSource({
        blockInstanceId,
        renderScope,
        variables,
      });
      active = getActiveState(blockInstanceId, renderScope);
    }
    if (active === undefined || !("key" in active)) {
      throw new Error("The Content Block source is not loaded");
    }
    if (action === "switch") {
      if (source === undefined) {
        throw new Error("Switch requires a Content Block source");
      }
      return await prepareContentBlockSwitch({
        state,
        blockInstanceId,
        currentSessionKey: active.key,
        source,
        renderScope,
        projectId,
        authority,
        session,
        context,
        variables,
      });
    }
    return await prepareContentBlockDisconnect({
      state,
      blockInstanceId,
      currentSessionKey: active.key,
      renderScope,
      session,
      context,
    });
  };

  const applyLifecycle = async (
    {
      action,
      blockInstanceId,
      renderScope,
      source,
      authority,
      dryRun = false,
      confirmationToken,
      variables,
    }: {
      action: "connect" | "switch" | "disconnect";
      blockInstanceId: string;
      renderScope: string;
      source?: ContentBlockSource;
      authority?: ContentBlockSourceAuthority;
      dryRun?: boolean;
      confirmationToken?: string;
      variables?: Readonly<Record<string, unknown>>;
    },
    execution?: {
      commitProjectPayload?: (
        payload: readonly BuilderPatchChange[]
      ) => void | Promise<void>;
    }
  ): Promise<ContentBlockApplicationResult<ContentBlockLifecyclePlan>> => {
    const projectVersionBeforePreparation =
      getProjectVersion?.() ?? context.projectVersion;
    const stateBeforePreparation = getState();
    const blockBeforePreparation =
      stateBeforePreparation.instances?.get(blockInstanceId);
    const hadPersistedBody =
      blockBeforePreparation?.children.some(
        (child) =>
          child.type !== "id" ||
          stateBeforePreparation.instances?.get(child.value)?.component !==
            blockTemplateComponent
      ) === true;
    const hadConfiguredSource =
      getConfiguredSource(stateBeforePreparation, blockInstanceId) !==
      undefined;
    let prepared: PreparedContentBlockSourceLifecycle;
    try {
      prepared = await prepareLifecycle({
        action,
        blockInstanceId,
        renderScope,
        source,
        authority,
        variables,
      });
    } catch (error) {
      if (error instanceof ContentBlockSourceAuthorityRequiredError) {
        return {
          status: "blocked",
          code: "content-source-authority-required",
          message: error.message,
        };
      }
      return {
        status: "blocked",
        code: "content-source-session-failed",
        message:
          error instanceof Error ? error.message : "Source update failed",
      };
    }
    const confirmationPayload = getLifecycleConfirmationPayload({
      projectId,
      projectVersion: projectVersionBeforePreparation,
      prepared,
      blockInstanceId,
      renderScope,
      source,
      authority,
    });
    const destructive =
      prepared.storageWrites.length > 0 ||
      (action === "connect" && hadPersistedBody) ||
      (action === "switch" && authority === "use-file-content") ||
      (action === "disconnect" && hadConfiguredSource);
    const confirmed =
      destructive === false
        ? true
        : await validateConfirmationToken(
            confirmationToken,
            confirmationPayload
          );
    if (destructive && (dryRun || confirmed === false)) {
      const confirmation = await createConfirmationToken(
        confirmationPayload,
        lifecycleConfirmationTtlMs
      );
      return {
        status: "confirmation-required",
        code: "content-source-confirmation-required",
        confirmationToken: confirmation.token,
        confirmationExpiresAt: new Date(confirmation.expiresAt).toISOString(),
        result: serializeLifecyclePlan(prepared),
      };
    }
    if (dryRun) {
      return { status: "complete", result: serializeLifecyclePlan(prepared) };
    }
    const projectCommit =
      execution?.commitProjectPayload ?? commitProjectPayload;
    const persisted = await persistPreparedContentBlockLifecycle({
      prepared,
      session,
      commitProjectPayload: projectCommit,
      canCommitProjectPayload: () =>
        prepared.projectPayload.length === 0 ||
        (projectCommit !== undefined &&
          (getProjectVersion?.() ?? context.projectVersion) ===
            projectVersionBeforePreparation),
    });
    const plan = {
      ...serializeLifecyclePlan(prepared),
      persistence: persisted.persistence,
    };
    if (persisted.status !== "complete") {
      return {
        status: persisted.status === "partial" ? "partial" : "blocked",
        code: "content-source-partial-persistence",
        message:
          persisted.status === "partial"
            ? "Some content changes were saved. Retry the unfinished steps."
            : "The content changes could not be saved.",
        result: plan,
      };
    }
    if (action === "disconnect") {
      activeKeys.delete(scopeKey(blockInstanceId, renderScope));
    } else if (persisted.state !== undefined) {
      publishSession(persisted.state);
    }
    return { status: "complete", result: plan };
  };

  const semanticEdit = async <Result extends Record<string, unknown>>({
    operationId,
    input,
    blockInstanceId,
    renderScope,
    variables,
    dryRun = false,
  }: {
    operationId: string;
    input: unknown;
    blockInstanceId: string;
    renderScope: string;
    variables?: Readonly<Record<string, unknown>>;
    dryRun?: boolean;
  }): Promise<
    | Readonly<{
        status: "complete";
        result: ContentBlockSemanticMutation<Result>;
      }>
    | Readonly<{
        status: "blocked" | "partial";
        code: string;
        message: string;
        result?: ContentBlockSemanticMutation<Result>;
      }>
  > => {
    const projectVersionBeforeMutation =
      getProjectVersion?.() ?? context.projectVersion;
    let active = getActiveState(blockInstanceId, renderScope);
    if (active === undefined) {
      await inspectSource({ blockInstanceId, renderScope, variables });
      active = getActiveState(blockInstanceId, renderScope);
    }
    if (active === undefined || !("root" in active) || !("key" in active)) {
      return {
        status: "blocked",
        code: "content-source-not-loaded",
        message: "Inspect and load the exact Content Block render scope first",
      };
    }
    const runtimeOperationId = operationId as BuilderRuntimeOperationId;
    if (operationId.startsWith("instances.") === false) {
      return {
        status: "blocked",
        code: "content-source-session-failed",
        message: "Content Block semantic edit requires an instance mutation",
      };
    }
    let operation;
    try {
      operation = getBuilderRuntimeOperation(runtimeOperationId);
    } catch {
      return {
        status: "blocked",
        code: "content-source-session-failed",
        message: "Content Block semantic edit operation is not supported",
      };
    }
    if (operation.kind !== "mutation") {
      return {
        status: "blocked",
        code: "content-source-session-failed",
        message: "Content Block semantic edit requires an instance mutation",
      };
    }
    const mutation = await executeBuilderRuntimeOperation<
      BuilderRuntimeMutation<Result>
    >({
      id: runtimeOperationId,
      state: getState(),
      input,
      context: {
        ...context,
        materializedContent: [active.root],
        returnStorageChanges: true,
      },
    });
    const storageChanges = mutation.storageChanges ?? [];
    if (storageChanges.length === 0) {
      if (mutation.payload.length > 0 && dryRun === false) {
        if (commitProjectPayload === undefined) {
          return {
            status: "blocked",
            code: "content-source-session-failed",
            message: "Project persistence is not available for this edit",
            result: mutation,
          };
        }
        await commitProjectPayload(mutation.payload);
      }
      return { status: "complete", result: mutation };
    }
    if (dryRun) {
      return { status: "complete", result: mutation };
    }
    const projectFirst =
      mutation.payload.length > 0 &&
      getRuntimeMutationPersistenceOrder(mutation) === "project-first";
    const projectStep: ContentBlockPersistencePlanStep | undefined =
      mutation.payload.length === 0
        ? undefined
        : {
            type: "project",
            preflight: async () =>
              commitProjectPayload !== undefined &&
              (getProjectVersion?.() ?? context.projectVersion) ===
                projectVersionBeforeMutation
                ? { status: "ready" }
                : {
                    status: "failed",
                    code: "content-source-session-failed",
                    message:
                      commitProjectPayload === undefined
                        ? "Project persistence is not available for this edit"
                        : "The project changed before the content edit was saved",
                  },
            persist: async () => {
              if (
                (getProjectVersion?.() ?? context.projectVersion) !==
                projectVersionBeforeMutation
              ) {
                return {
                  status: "failed",
                  code: "content-source-session-failed",
                  message: projectFirst
                    ? "The project changed before the content edit was saved"
                    : "MDX Assets were saved, but the project changed before its step.",
                };
              }
              if (commitProjectPayload === undefined) {
                return {
                  status: "failed",
                  code: "content-source-session-failed",
                  message: "Project persistence is not available for this edit",
                };
              }
              try {
                await commitProjectPayload(mutation.payload);
                return { status: "saved" };
              } catch (error) {
                return {
                  status: "failed",
                  code: "content-source-session-failed",
                  message:
                    error instanceof Error
                      ? error.message
                      : "Project persistence failed",
                };
              }
            },
          };
    const persistence = await persistContentBlockStorageChangesSerially({
      session,
      changes: storageChanges,
      publishState: publishSession,
      projectStep,
      persistenceOrder: projectFirst ? "project-first" : "storage-first",
    });
    if (persistence.status === "complete") {
      return {
        status: "complete",
        result: { ...mutation, persistence },
      };
    }
    const failure = persistence.steps.find(({ status }) => status === "failed");
    return {
      status: persistence.status === "partial" ? "partial" : "blocked",
      code: "content-source-partial-persistence",
      message:
        failure?.message ??
        (persistence.status === "partial"
          ? "Some content changes were saved. Retry the unfinished steps."
          : "The content changes could not be saved."),
      result: { ...mutation, persistence },
    };
  };

  const recover = async ({
    blockInstanceId,
    renderScope,
    action,
    dryRun = false,
  }: {
    blockInstanceId: string;
    renderScope: string;
    action: "retry" | "reload-remote" | "copy-unsaved-mdx";
    dryRun?: boolean;
  }) => {
    const active = getActiveState(blockInstanceId, renderScope);
    if (active === undefined || !("key" in active)) {
      return {
        status: "blocked" as const,
        code: "content-source-not-loaded" as const,
        message: "The MDX Asset is not loaded",
      };
    }
    const recovered = await recoverContentBlockSession({
      session,
      state: active,
      action,
      dryRun,
      reopen:
        action === "retry" && active.status === "recoverable"
          ? async () => {
              const configured = getConfiguredSource(
                getState(),
                blockInstanceId
              );
              return configured === undefined
                ? active
                : session.open({
                    blockInstanceId,
                    source: configured,
                    renderScope,
                    state: getState(),
                    projectId,
                  });
            }
          : undefined,
    });
    publishSession(recovered.state);
    const inspection = await inspectSource({
      blockInstanceId,
      renderScope,
      load: false,
    });
    return recovered.status === "complete"
      ? ({
          status: "complete",
          result: {
            source: recovered.source,
            inspection,
            changedAsset: recovered.changedAsset,
          },
        } as const)
      : ({
          status: "blocked",
          code: recovered.code,
          message: recovered.message,
          result: { inspection, changedAsset: false },
        } as const);
  };

  const getMaterializedContent = () =>
    session.list().flatMap((state) => ("root" in state ? [state.root] : []));

  const migrateTemplateReferences = async ({
    templateInstanceId,
    migration,
    renderScope,
    variables,
    selectedAssetIds = [],
    dryRun = false,
    confirmationToken,
  }: {
    templateInstanceId: string;
    migration: Readonly<{ type: "rename"; to: string } | { type: "remove" }>;
    renderScope: string;
    variables?: Readonly<Record<string, unknown>>;
    selectedAssetIds?: readonly string[];
    dryRun?: boolean;
    confirmationToken?: string;
  }) => {
    const state = getState();
    const template = getSourceBackedBlockTemplateContext({
      templateInstanceId,
      instances: state.instances ?? new Map(),
      props: state.props?.values() ?? [],
    });
    if (template === undefined) {
      return {
        status: "blocked" as const,
        code: "content-source-not-configured" as const,
        message:
          "The instance is not a direct Template of a source-backed Content Block",
        files: [],
        updateCount: 0,
        omissionCount: 0,
        discoveryComplete: false,
      };
    }
    const candidateIds = new Set(selectedAssetIds);
    let discoveryComplete =
      template.source.type === "asset" || selectedAssetIds.length > 0;
    if (template.source.type === "asset" && selectedAssetIds.length === 0) {
      candidateIds.add(template.source.assetId);
    } else if (
      template.source.type === "expression" &&
      selectedAssetIds.length === 0
    ) {
      const staticAssetId = parseJsonExpression(template.source.value);
      if (typeof staticAssetId === "string" && staticAssetId !== "") {
        candidateIds.add(staticAssetId);
        discoveryComplete = true;
      } else {
        const candidates = resolvePublishedMdxAssetCandidates({
          build: {
            instances: [...(state.instances?.values() ?? [])],
            props: [...(state.props?.values() ?? [])],
            dataSources: [...(state.dataSources?.values() ?? [])],
            resources: [...(state.resources?.values() ?? [])],
            pages: state.pages,
          },
          artifact: migrationContentArtifact,
          allowUnresolved: true,
          blockInstanceIds: new Set([template.blockInstanceId]),
        }).get(template.blockInstanceId);
        if (candidates !== undefined && candidates.length > 0) {
          for (const assetId of candidates) {
            candidateIds.add(assetId);
          }
          discoveryComplete = true;
        }
      }
      if (discoveryComplete === false) {
        const resolved = await session.open({
          blockInstanceId: template.blockInstanceId,
          source: template.source,
          renderScope,
          state,
          projectId,
          variables,
        });
        if ("identity" in resolved) {
          candidateIds.add(resolved.identity.assetId);
        }
      }
    }
    if (candidateIds.size === 0) {
      return {
        status: "blocked" as const,
        code: "content-source-not-loaded" as const,
        message: "No reachable MDX Assets were resolved for migration",
        files: [],
        updateCount: 0,
        omissionCount: 0,
        discoveryComplete,
      };
    }
    if (candidateIds.size > 100) {
      return {
        status: "blocked" as const,
        code: "content-source-session-failed" as const,
        message: "MDX template migration is limited to 100 Assets",
        files: [],
        updateCount: 0,
        omissionCount: 0,
        discoveryComplete: false,
      };
    }
    const loaded: Array<{
      key: string;
      assetId: string;
      revision: string;
      contentRef: string;
      source: string;
    }> = [];
    const diagnostics: MdxTemplateMigrationDiagnostic[] = [];
    for (const assetId of [...candidateIds].sort()) {
      const sourceState = await session.open({
        blockInstanceId: template.blockInstanceId,
        source: { type: "asset", assetId },
        renderScope: `${renderScope}:template-migration:${assetId}`,
        state,
        projectId,
      });
      if (!("identity" in sourceState) || !("source" in sourceState)) {
        const authorizationFailed = sourceState.diagnostics.some(
          (diagnostic) => diagnostic.code === "authorization-failed"
        );
        diagnostics.push({
          code: authorizationFailed
            ? "asset-authorization-failed"
            : "asset-write-failed",
          assetId,
          contentRef: assetId,
          message:
            "error" in sourceState
              ? sourceState.error.message
              : authorizationFailed
                ? "The referenced MDX Asset is not authorized"
                : "The referenced MDX Asset could not be loaded",
        });
        continue;
      }
      loaded.push({
        key: sourceState.key,
        assetId,
        revision: sourceState.identity.revision,
        contentRef: sourceState.identity.contentRef,
        source: sourceState.source,
      });
    }
    const normalizedMigration: MdxTemplateMigration =
      migration.type === "rename"
        ? { type: "rename", from: template.templateName, to: migration.to }
        : { type: "remove", name: template.templateName };
    const plan = await planMdxTemplateMigration({
      projectId,
      migration: normalizedMigration,
      files: loaded,
      selectionAssetIds: [...candidateIds].sort(),
      confirmationScope: {
        templateInstanceId,
        blockInstanceId: template.blockInstanceId,
        projectVersion: getProjectVersion?.() ?? context.projectVersion,
        renderScope,
        discoveryComplete,
      },
    });
    const confirmed = await validateMdxTemplateMigrationConfirmation({
      projectId,
      plan,
      confirmationToken,
    });
    const publicFiles: Array<{
      assetId: string;
      revision?: string;
      contentRef: string;
      changed?: boolean;
      status?: "updated" | "unchanged" | "failed";
      updateCount: number;
      omissionCount: number;
      diagnostics: readonly MdxTemplateMigrationDiagnostic[];
    }> = plan.files.map(
      ({
        assetId,
        revision,
        contentRef,
        changed,
        updateCount,
        omissionCount,
        diagnostics,
      }) => ({
        assetId,
        revision,
        contentRef,
        changed,
        updateCount,
        omissionCount,
        diagnostics,
      })
    );
    for (const diagnostic of diagnostics) {
      publicFiles.push({
        assetId: diagnostic.assetId,
        contentRef: diagnostic.contentRef,
        changed: false,
        status: "failed" as const,
        updateCount: 0,
        omissionCount: 0,
        diagnostics: [diagnostic],
      });
    }
    if (discoveryComplete === false) {
      return {
        status: "blocked" as const,
        code: "content-source-session-failed" as const,
        message:
          "The complete MDX candidate set cannot be proven; select the reviewed Assets explicitly",
        files: publicFiles,
        updateCount: plan.updateCount,
        omissionCount: plan.omissionCount,
        discoveryComplete,
        diagnostics,
      };
    }
    if (dryRun || confirmed === false) {
      return {
        status: "confirmation-required" as const,
        code: "content-source-confirmation-required" as const,
        confirmationToken: plan.confirmationToken,
        confirmationExpiresAt: plan.confirmationExpiresAt,
        files: publicFiles,
        updateCount: plan.updateCount,
        omissionCount: plan.omissionCount,
        discoveryComplete,
        diagnostics,
      };
    }
    const results = publicFiles.filter(({ status }) => status === "failed");
    for (const file of plan.files) {
      const loadedFile = loaded.find(({ assetId }) => assetId === file.assetId);
      if (
        loadedFile === undefined ||
        file.changed === false ||
        file.diagnostics.length > 0
      ) {
        results.push({
          ...publicFiles.find(({ assetId }) => assetId === file.assetId)!,
          status:
            file.diagnostics.length > 0
              ? ("failed" as const)
              : ("unchanged" as const),
        });
        continue;
      }
      const restored = await session.persistSourceReplacement({
        key: loadedFile.key,
        expectedSource: loadedFile.source,
        source: file.source,
      });
      const restoreDiagnostics: readonly MdxTemplateMigrationDiagnostic[] =
        restored.status === "applied"
          ? file.diagnostics
          : [
              {
                code:
                  restored.reason === "unauthorized"
                    ? "asset-authorization-failed"
                    : restored.reason === "identity-mismatch" ||
                        restored.reason === "source-mismatch"
                      ? "asset-revision-conflict"
                      : "asset-write-failed",
                assetId: file.assetId,
                contentRef: file.contentRef,
                message: `MDX Asset migration is blocked: ${restored.reason}`,
              },
            ];
      results.push({
        ...publicFiles.find(({ assetId }) => assetId === file.assetId)!,
        diagnostics: restoreDiagnostics,
        status:
          restored.status === "applied"
            ? ("updated" as const)
            : ("failed" as const),
      });
    }
    const updated = results.filter(({ status }) => status === "updated");
    const failed = results.filter(({ status }) => status === "failed");
    return {
      status:
        failed.length === 0
          ? ("complete" as const)
          : updated.length > 0
            ? ("partial" as const)
            : ("blocked" as const),
      code:
        failed.length > 0
          ? ("content-source-session-failed" as const)
          : undefined,
      files: results,
      updateCount: updated.reduce((sum, file) => sum + file.updateCount, 0),
      omissionCount: updated.reduce((sum, file) => sum + file.omissionCount, 0),
      discoveryComplete,
      diagnostics,
      changedAsset: updated.length > 0,
    };
  };

  const saveStorageChanges = async (
    changes: readonly ContentStorageChange[]
  ): Promise<
    | Readonly<{
        status: "complete";
        persistence: ContentBlockPersistenceResult;
      }>
    | Readonly<{
        status: "partial" | "failed";
        code: ContentBlockApplicationErrorCode;
        message: string;
        persistence: ContentBlockPersistenceResult;
      }>
  > => {
    const persisted = await persistContentBlockStorageChangesSerially({
      session,
      changes,
      publishState: publishSession,
    });
    return persisted.status === "complete"
      ? { status: "complete", persistence: persisted }
      : {
          status: persisted.status,
          code: "content-source-partial-persistence",
          message:
            persisted.status === "partial"
              ? "Some MDX Assets were saved. Retry the unfinished roots."
              : "The MDX Asset changes could not be saved.",
          persistence: persisted,
        };
  };

  const preflightStorageChanges = async (
    changes: readonly ContentStorageChange[]
  ) => preflightContentBlockStorageChanges({ session, changes });

  return {
    inspectSource,
    applyLifecycle,
    semanticEdit,
    recover,
    migrateTemplateReferences,
    getMaterializedContent,
    preflightStorageChanges,
    saveStorageChanges,
  };
};

export type ContentBlockApplicationOperations = ReturnType<
  typeof createContentBlockApplicationOperations
>;
