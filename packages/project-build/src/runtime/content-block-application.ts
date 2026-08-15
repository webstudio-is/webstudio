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
  getMdxContentPersistencePlan,
  prepareContentBlockConnect,
  prepareContentBlockDisconnect,
  prepareContentBlockSwitch,
  type ContentBlockSourceAuthority,
  type PreparedContentBlockSourceLifecycle,
} from "./content-block-source-lifecycle";
import type {
  BuilderRuntimeContext,
  ContentBlockSourceInspection,
} from "./context";
import type { MdxAssetEditingSessionState } from "./mdx-asset-session";
import type { PendingMdxContentStorageWrite } from "./mdx-storage-adapter";
import type { BuilderRuntimeMutation, ContentStorageChange } from "./mutation";
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

type MdxAssetEditingSession = Parameters<
  typeof prepareContentBlockConnect
>[0]["session"] &
  Readonly<{
    queueSave: (input: {
      key: string;
      changes: readonly ContentStorageChange[];
    }) => Promise<MdxAssetEditingSessionState>;
    retry: (key: string) => Promise<MdxAssetEditingSessionState>;
    reloadRemote: (key: string) => Promise<MdxAssetEditingSessionState>;
    copyUnsavedSource: (key: string) => string | undefined;
    list: () => readonly MdxAssetEditingSessionState[];
    persistSourceRestore: (input: {
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
  | "content-source-atomic-persistence-unavailable"
  | "content-source-session-failed"
  | "content-source-write-conflict"
  | "content-source-authorization-failed"
  | "content-source-mixed-mutation-unavailable"
  | "content-source-multiple-roots-unavailable";

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
    }>;

const lifecycleConfirmationTtlMs = 5 * 60_000;

const getConfiguredSource = (state: BuilderState, blockInstanceId: string) =>
  getContentBlockSource({
    blockInstanceId,
    props: state.props?.values() ?? [],
  });

const getSessionErrorCode = (
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

const getSessionMessage = (state: MdxAssetEditingSessionState) =>
  "error" in state
    ? state.error.message
    : state.status === "conflicting"
      ? "The MDX Asset changed remotely"
      : `The MDX Asset session is ${state.status}`;

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

  const rollbackPreparedStorage = async (
    prepared: PreparedContentBlockSourceLifecycle
  ) => {
    for (const storage of prepared.undoEntry.storage) {
      const restored = await storage.session.restoreSource({
        key: storage.key,
        expectedSource: storage.afterSource,
        source: storage.beforeSource,
      });
      if (restored.status === "blocked") {
        return `Prepared MDX rollback is blocked: ${restored.reason}`;
      }
    }
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
    const persistence = getMdxContentPersistencePlan(prepared);
    if (persistence.status === "blocked") {
      const rollbackError = await rollbackPreparedStorage(prepared);
      return {
        status: "blocked",
        code:
          rollbackError === undefined
            ? "content-source-atomic-persistence-unavailable"
            : "content-source-session-failed",
        message: rollbackError ?? persistence.reason,
        result: serializeLifecyclePlan(prepared),
      };
    }
    const confirmationPayload = getLifecycleConfirmationPayload({
      projectId,
      projectVersion: getProjectVersion?.() ?? context.projectVersion,
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
      const rollbackError = await rollbackPreparedStorage(prepared);
      if (rollbackError !== undefined) {
        return {
          status: "blocked",
          code: "content-source-session-failed",
          message: rollbackError,
          result: serializeLifecyclePlan(prepared),
        };
      }
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
    if (persistence.mode === "single-asset") {
      const sourceState = prepared.sourceState;
      if (sourceState === undefined || !("key" in sourceState)) {
        return {
          status: "blocked",
          code: "content-source-not-loaded",
          message: "The MDX Asset is not loaded",
          result: serializeLifecyclePlan(prepared),
        };
      }
      const saved = publishSession(await session.flush(sourceState.key));
      if (saved.status !== "saved") {
        return {
          status: "blocked",
          code: getSessionErrorCode(saved),
          message: getSessionMessage(saved),
          result: serializeLifecyclePlan(prepared),
        };
      }
    } else if (persistence.mode === "project") {
      const commit = execution?.commitProjectPayload ?? commitProjectPayload;
      if (commit === undefined) {
        return {
          status: "blocked",
          code: "content-source-session-failed",
          message: "Project persistence is not available",
          result: serializeLifecyclePlan(prepared),
        };
      }
      await commit(prepared.projectPayload);
    }
    if (action === "disconnect") {
      activeKeys.delete(scopeKey(blockInstanceId, renderScope));
    } else if (prepared.sourceState !== undefined) {
      publishSession(prepared.sourceState);
    }
    return { status: "complete", result: serializeLifecyclePlan(prepared) };
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
        result: BuilderRuntimeMutation<Result>;
      }>
    | Readonly<{
        status: "blocked";
        code: string;
        message: string;
        result?: BuilderRuntimeMutation<Result>;
      }>
  > => {
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
    if (mutation.payload.length > 0) {
      return {
        status: "blocked",
        code: "content-source-mixed-mutation-unavailable",
        message: "Project and MDX Asset changes cannot be persisted atomically",
        result: mutation,
      };
    }
    const externalRoots = new Set(
      storageChanges.flatMap((change) =>
        change.root.type === "external"
          ? [getContentStorageIdentityKey(change.root.identity)]
          : []
      )
    );
    if (externalRoots.size !== 1) {
      return {
        status: "blocked",
        code: "content-source-multiple-roots-unavailable",
        message: "Multiple MDX Assets cannot be persisted atomically",
        result: mutation,
      };
    }
    if (dryRun) {
      return { status: "complete", result: mutation };
    }
    const pending = publishSession(
      await session.queueSave({ key: active.key, changes: storageChanges })
    );
    const saved =
      pending.status === "pending"
        ? publishSession(await session.flush(pending.key))
        : pending;
    if (saved.status !== "saved") {
      return {
        status: "blocked",
        code: getSessionErrorCode(saved),
        message: getSessionMessage(saved),
        result: mutation,
      };
    }
    return { status: "complete", result: mutation };
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
    if (action === "copy-unsaved-mdx") {
      const source = session.copyUnsavedSource(active.key);
      if (source === undefined) {
        return {
          status: "blocked" as const,
          code: "content-source-session-failed" as const,
          message: "The MDX Asset session has no unsaved local source",
        };
      }
      return {
        status: "complete" as const,
        result: {
          source,
          inspection: await inspectSource({
            blockInstanceId,
            renderScope,
            load: false,
          }),
          changedAsset: false,
        },
      };
    }
    if (dryRun) {
      return {
        status: "complete" as const,
        result: {
          inspection: await inspectSource({
            blockInstanceId,
            renderScope,
            load: false,
          }),
          changedAsset: false,
        },
      };
    }
    if (action === "retry" && active.status !== "failed") {
      return {
        status: "blocked" as const,
        code: "content-source-session-failed" as const,
        message: `Retry is not available while the MDX Asset session is ${active.status}`,
      };
    }
    if (action === "reload-remote" && active.status !== "conflicting") {
      return {
        status: "blocked" as const,
        code: "content-source-session-failed" as const,
        message: `Remote reload is not available while the MDX Asset session is ${active.status}`,
      };
    }
    const next = publishSession(
      action === "retry"
        ? await session.retry(active.key)
        : await session.reloadRemote(active.key)
    );
    const inspection = await inspectSource({
      blockInstanceId,
      renderScope,
      load: false,
    });
    return next.status === "saved"
      ? ({
          status: "complete",
          result: {
            inspection,
            changedAsset: action === "retry" && "localSource" in active,
          },
        } as const)
      : ({
          status: "blocked",
          code: getSessionErrorCode(next),
          message: getSessionMessage(next),
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
      const restored = await session.persistSourceRestore({
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
    | Readonly<{ status: "complete" }>
    | Readonly<{
        status: "blocked";
        code: ContentBlockApplicationErrorCode;
        message: string;
      }>
  > => {
    const externalIdentities = new Map(
      changes.flatMap((change) =>
        change.root.type === "external"
          ? [
              [
                getContentStorageIdentityKey(change.root.identity),
                change.root.identity,
              ] as const,
            ]
          : []
      )
    );
    if (externalIdentities.size !== 1) {
      return {
        status: "blocked",
        code: "content-source-multiple-roots-unavailable",
        message: "Multiple MDX Assets cannot be persisted atomically",
      };
    }
    const [identity] = externalIdentities.values();
    const active = getActiveState(
      identity.blockInstanceId,
      identity.renderScope
    );
    if (
      active === undefined ||
      !("key" in active) ||
      !("identity" in active) ||
      getContentStorageIdentityKey(active.identity) !==
        getContentStorageIdentityKey(identity)
    ) {
      return {
        status: "blocked",
        code: "content-source-not-loaded",
        message: "The exact revision and render scope are not loaded",
      };
    }
    const queued = publishSession(
      await session.queueSave({ key: active.key, changes })
    );
    const saved =
      queued.status === "pending"
        ? publishSession(await session.flush(queued.key))
        : queued;
    return saved.status === "saved"
      ? { status: "complete" }
      : {
          status: "blocked",
          code: getSessionErrorCode(saved),
          message: getSessionMessage(saved),
        };
  };

  return {
    inspectSource,
    applyLifecycle,
    semanticEdit,
    recover,
    migrateTemplateReferences,
    getMaterializedContent,
    saveStorageChanges,
  };
};

export type ContentBlockApplicationOperations = ReturnType<
  typeof createContentBlockApplicationOperations
>;
