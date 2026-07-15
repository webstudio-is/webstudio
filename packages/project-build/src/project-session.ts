import hash from "@emotion/hash";
import type {
  RuntimeOperationContract,
  RuntimeOperationId,
} from "./contracts/builder-runtime";
import { runtimeOperationContracts } from "./contracts/builder-runtime";
import type { BuilderNamespace } from "./contracts/namespaces";
import type { BuilderPatchTransaction } from "./contracts/patch";
import { hasGeneratedRecordWritePatch } from "./contracts/patch";
import type { BuilderApiCapability } from "./contracts/permissions";
import { projectOutput } from "./runtime/output";
import {
  builderRuntimeContext,
  type BuilderRuntimeContext,
} from "./runtime/context";
import {
  BuilderRuntimeError,
  getValidationIssues,
  sanitizeValidationDetail,
  type SemanticValidationIssue,
} from "./runtime/errors";
import type { BuilderRuntimeMutation } from "./runtime/mutation";
import { executeBuilderRuntimeOperation } from "./runtime/registry";
import type { BuilderState } from "./state/builder-state";
import { getMissingBuilderStateNamespaces } from "./state/builder-state";
import {
  createBuilderStateFreshness,
  getBuilderStateNamespaceFreshness,
  markBuilderStateNamespacesInvalidated,
  markBuilderStateNamespacesStale,
  type BuilderStateFreshness,
  type BuilderStateNamespaceSource,
} from "./state/freshness";
import { applyBuilderPatchTransactions } from "./state/patch";

type ProjectSessionSource = "local" | "remote" | "dry-run" | "server";
type ProjectSessionEnvelopeContract = Pick<
  RuntimeOperationContract,
  "id" | "readNamespaces" | "writeNamespaces" | "invalidatesNamespaces"
>;
type ProjectSessionDiagnosticLevel = "info" | "warning" | "error";

export type ProjectSessionDiagnostic = {
  level: ProjectSessionDiagnosticLevel;
  code: string;
  message: string;
  issues?: readonly SemanticValidationIssue[];
  details?: unknown;
};

export type ProjectSessionSnapshot = {
  projectId: string;
  buildId: string;
  version: number;
  state: BuilderState;
  freshness: BuilderStateFreshness;
  compatibilityVersion: string;
  compatibility: ProjectSessionCompatibility;
};

export type ProjectSessionPersistedSnapshot = ProjectSessionSnapshot & {
  revision?: string;
};

export type ProjectSessionRemoteSnapshot = {
  projectId: string;
  buildId: string;
  version: number;
  state: BuilderState;
};

export type ProjectSessionCommitResult = {
  version: number;
};

export type ProjectSessionPermissions = {
  canView: boolean;
  canEdit: boolean;
  canBuild: boolean;
  canAdmin: boolean;
  canUseApi: boolean;
};

export type ProjectSessionCompatibility = {
  sessionVersion: string;
  runtimeContractVersion: string;
  projectSchemaVersion: string;
  apiCompatibilityVersion?: string;
};

export type ProjectSessionTransport = {
  getCompatibility?: (input: {
    projectId: string;
  }) => Promise<ProjectSessionCompatibility>;
  fetchNamespaces: (input: {
    projectId: string;
    namespaces: readonly BuilderNamespace[];
  }) => Promise<ProjectSessionRemoteSnapshot>;
  commitPatch: (input: {
    projectId: string;
    buildId: string;
    baseVersion: number;
    transactions: readonly BuilderPatchTransaction[];
  }) => Promise<ProjectSessionCommitResult>;
  executeServerOperation?: <Result>(input: {
    operationId: string;
    input: unknown;
  }) => Promise<Result>;
  getPermissions?: (input: {
    projectId: string;
  }) => Promise<ProjectSessionPermissions>;
};

export type ProjectSessionStorage = {
  load: () => Promise<ProjectSessionPersistedSnapshot | undefined>;
  save: (
    snapshot: ProjectSessionSnapshot,
    options: { expectedRevision?: string }
  ) => Promise<{ revision?: string } | undefined>;
  clear: () => Promise<void>;
};

export type ProjectSessionOptions = {
  projectId: string;
  transport: ProjectSessionTransport;
  storage: ProjectSessionStorage;
  runtimeContext?: BuilderRuntimeContext;
  compatibilityVersion?: string;
};

type ResolvedProjectSessionOptions = Omit<
  ProjectSessionOptions,
  "runtimeContext" | "compatibilityVersion"
> & {
  runtimeContext: BuilderRuntimeContext;
  compatibilityVersion: string;
};

export type ProjectSessionEnvelope<Result = unknown> = {
  operationId: string;
  projectId: string;
  buildId?: string;
  version?: number;
  /** Where the returned state was materialized, independently of commit state. */
  source: ProjectSessionSource;
  result: Result;
  state: {
    committed: boolean;
    freshness: BuilderStateFreshness;
    compatibility?: ProjectSessionCompatibility;
  };
  namespaces: {
    read: readonly BuilderNamespace[];
    write: readonly BuilderNamespace[];
    invalidated: readonly BuilderNamespace[];
    missing: readonly BuilderNamespace[];
  };
  diagnostics: ProjectSessionDiagnostic[];
  transaction?: BuilderPatchTransaction;
};

const getNamespaceCounts = (envelope: ProjectSessionEnvelope) =>
  Object.fromEntries(
    Object.entries(envelope.namespaces).map(([name, values]) => [
      name,
      values.length,
    ])
  ) as Record<keyof ProjectSessionEnvelope["namespaces"], number>;

export const serializeProjectSessionMeta = (
  envelope: ProjectSessionEnvelope,
  input: { verbose?: boolean } = {}
) => {
  const diagnostics = envelope.diagnostics.map(({ level, code, message }) => ({
    level,
    code,
    message: sanitizeValidationDetail(message),
  }));
  const diagnosticErrorCount = diagnostics.filter(
    (diagnostic) => diagnostic.level === "error"
  ).length;
  const compact = {
    operationId: envelope.operationId,
    projectId: envelope.projectId,
    ...(envelope.buildId === undefined ? {} : { buildId: envelope.buildId }),
    ...(envelope.version === undefined ? {} : { version: envelope.version }),
    source: envelope.source,
    committed: envelope.state.committed,
    namespaceCounts: getNamespaceCounts(envelope),
    diagnosticCount: diagnostics.length,
    ...(diagnosticErrorCount === 0 ? {} : { diagnosticErrorCount }),
    ...(diagnostics.length === 0 ? {} : { diagnostics }),
    ...(envelope.state.compatibility === undefined
      ? {}
      : {
          compatibilityVersion: envelope.state.compatibility.sessionVersion,
        }),
    ...(envelope.source !== "dry-run" || envelope.transaction === undefined
      ? {}
      : { transaction: envelope.transaction }),
  };
  return projectOutput({
    input,
    compact,
    expanded: () => ({
      namespaces: envelope.namespaces,
      freshness: envelope.state.freshness,
      compatibility: envelope.state.compatibility,
      diagnostics: redactProjectSessionValue(envelope.diagnostics),
    }),
  });
};

export type ProjectSessionMutationOptions = {
  dryRun?: boolean;
  permit?: BuilderApiCapability;
};

export type ProjectSessionReadOptions = {
  permit?: BuilderApiCapability;
};

export type ProjectSessionServerOperationDescriptor = {
  id: string;
  invalidatesNamespaces?: readonly BuilderNamespace[];
  refetchInvalidatedNamespaces?: boolean;
};

const defaultCompatibilityVersion = "project-session-v1";
const defaultRuntimeContractVersion = `runtime-contracts:${hash(
  JSON.stringify(runtimeOperationContracts)
)}`;
const defaultProjectSchemaVersion = "builder-state-v1";
export const projectSessionBusyMessage =
  "Another Webstudio CLI/MCP operation is updating the local project session. Wait a moment and retry this command. Run `webstudio mcp single-op-call` commands sequentially against the same `.webstudio` folder.";
const projectSessionBusyRetryDelays = [100, 300, 700] as const;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

class ProjectSessionBusyError extends Error {
  code = "PROJECT_SESSION_BUSY";

  constructor(options: { cause?: unknown } = {}) {
    super(projectSessionBusyMessage, options);
    this.name = "PROJECT_SESSION_BUSY";
  }
}

export const createDefaultProjectSessionCompatibility = (
  sessionVersion: string
): ProjectSessionCompatibility => ({
  sessionVersion,
  runtimeContractVersion: defaultRuntimeContractVersion,
  projectSchemaVersion: defaultProjectSchemaVersion,
});

const isCompatible = (
  snapshot: ProjectSessionPersistedSnapshot,
  compatibility: ProjectSessionCompatibility
) => {
  const snapshotCompatibility =
    snapshot.compatibility ??
    createDefaultProjectSessionCompatibility(snapshot.compatibilityVersion);
  return (
    snapshotCompatibility.sessionVersion === compatibility.sessionVersion &&
    snapshotCompatibility.runtimeContractVersion ===
      compatibility.runtimeContractVersion &&
    snapshotCompatibility.projectSchemaVersion ===
      compatibility.projectSchemaVersion &&
    snapshotCompatibility.apiCompatibilityVersion ===
      compatibility.apiCompatibilityVersion
  );
};

const operationContractById = new Map(
  runtimeOperationContracts.map((contract) => [contract.id, contract])
);

const getRuntimeOperationContract = (
  operationId: RuntimeOperationId
): RuntimeOperationContract => {
  const contract = operationContractById.get(operationId);
  if (contract === undefined) {
    throw new Error(`Runtime operation "${operationId}" is not in contracts.`);
  }
  return contract;
};

const mergeBuilderState = (
  current: BuilderState,
  incoming: BuilderState,
  namespaces: readonly BuilderNamespace[]
): BuilderState => {
  const next = { ...current };
  for (const namespace of namespaces) {
    const value = incoming[namespace];
    if (value !== undefined) {
      (next as Record<string, unknown>)[namespace] = value;
    }
  }
  return next;
};

const isFresh = (
  freshness: BuilderStateFreshness,
  namespace: BuilderNamespace
) => getBuilderStateNamespaceFreshness(freshness, namespace).status === "fresh";

const getNamespacesNeedingRemote = (
  snapshot: ProjectSessionSnapshot | undefined,
  namespaces: readonly BuilderNamespace[]
) => {
  if (snapshot === undefined) {
    return namespaces;
  }
  return namespaces.filter(
    (namespace) =>
      snapshot.state[namespace] === undefined ||
      isFresh(snapshot.freshness, namespace) === false
  );
};

const mergeNamespaces = (
  ...groups: readonly (readonly BuilderNamespace[])[]
): BuilderNamespace[] => [...new Set(groups.flat())];

const createFreshness = (
  state: BuilderState,
  version: number,
  loadedAt: string,
  source: BuilderStateNamespaceSource = "remote"
): BuilderStateFreshness =>
  createBuilderStateFreshness({
    state,
    version,
    source,
    loadedAt,
  });

const mergeFreshness = ({
  current,
  state,
  namespaces,
  version,
  loadedAt,
  source = "remote",
}: {
  current: BuilderStateFreshness | undefined;
  state: BuilderState;
  namespaces: readonly BuilderNamespace[];
  version: number;
  loadedAt: string;
  source?: BuilderStateNamespaceSource;
}): BuilderStateFreshness => {
  const next =
    current === undefined
      ? createBuilderStateFreshness({ state })
      : { ...current };
  const fresh = createFreshness(state, version, loadedAt, source);
  for (const namespace of namespaces) {
    next[namespace] = fresh[namespace];
  }
  return next;
};

const mergeSnapshot = ({
  current,
  remote,
  namespaces,
  compatibilityVersion,
  compatibility,
}: {
  current: ProjectSessionSnapshot | undefined;
  remote: ProjectSessionRemoteSnapshot;
  namespaces: readonly BuilderNamespace[];
  compatibilityVersion: string;
  compatibility: ProjectSessionCompatibility;
}): ProjectSessionSnapshot => {
  const state = mergeBuilderState(
    current?.state ?? {},
    remote.state,
    namespaces
  );
  return {
    projectId: remote.projectId,
    buildId: remote.buildId,
    version: remote.version,
    state,
    freshness: mergeFreshness({
      current: current?.freshness,
      state,
      namespaces,
      version: remote.version,
      loadedAt: new Date().toISOString(),
    }),
    compatibilityVersion,
    compatibility,
  };
};

const redactKeys = new Set([
  "authorization",
  "auth",
  "authToken",
  "cookie",
  "cookies",
  "password",
  "secret",
  "token",
  "x-auth-token",
]);

const getProjectSessionErrorCode = (error: unknown) => {
  if (error instanceof BuilderRuntimeError) {
    return error.code;
  }
  if (
    error instanceof Error &&
    error.message.includes("Project session snapshot changed on disk")
  ) {
    return "PROJECT_SESSION_BUSY";
  }
  if (typeof error === "object" && error !== null) {
    if ("code" in error) {
      const code = error.code;
      if (typeof code === "string") {
        return code;
      }
    }
  }
  return error instanceof Error ? error.name : "UNKNOWN_ERROR";
};

export const redactProjectSessionValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactProjectSessionValue);
  }
  if (typeof value === "string") {
    return sanitizeValidationDetail(value);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    redacted[key] = redactKeys.has(key)
      ? "[redacted]"
      : redactProjectSessionValue(entry);
  }
  return redacted;
};

const errorDiagnostic = (error: unknown): ProjectSessionDiagnostic => {
  const issues = getValidationIssues(error);
  return {
    level: "error",
    code: getProjectSessionErrorCode(error),
    message: error instanceof Error ? error.message : "Unknown error",
    ...(issues === undefined
      ? {}
      : {
          issues: redactProjectSessionValue(
            issues
          ) as SemanticValidationIssue[],
        }),
    details: redactProjectSessionValue(error),
  };
};

const shouldRefreshPermissionsAfterError = (error: unknown) => {
  const code = getProjectSessionErrorCode(error);
  return (
    code === "UNAUTHORIZED" || code === "FORBIDDEN" || code === "PLAN_REQUIRED"
  );
};

const isVersionConflictError = (error: unknown) =>
  getProjectSessionErrorCode(error) === "CONFLICT";

const isProjectSessionBusyError = (error: unknown) =>
  getProjectSessionErrorCode(error) === "PROJECT_SESSION_BUSY";

const createProjectSessionBusyError = (cause: unknown) =>
  new ProjectSessionBusyError({ cause });

export const hasProjectSessionPermit = (
  permissions: ProjectSessionPermissions,
  permit: BuilderApiCapability
) => {
  if (permit === "api") {
    return permissions.canUseApi;
  }
  if (permissions.canUseApi === false) {
    return false;
  }
  if (permit === "view") {
    return permissions.canView;
  }
  if (permit === "edit") {
    return permissions.canEdit;
  }
  if (permit === "build") {
    return permissions.canBuild;
  }
  return permissions.canAdmin;
};

export class ProjectSession {
  #snapshot: ProjectSessionSnapshot | undefined;
  #revision: string | undefined;
  #permissions: ProjectSessionPermissions | undefined;
  #mutationQueue: Promise<unknown> = Promise.resolve();
  #options: ResolvedProjectSessionOptions;

  constructor(options: ProjectSessionOptions) {
    const runtimeContext = options.runtimeContext ?? builderRuntimeContext;
    this.#options = {
      ...options,
      compatibilityVersion:
        options.compatibilityVersion ?? defaultCompatibilityVersion,
      runtimeContext: {
        ...runtimeContext,
        projectId: runtimeContext.projectId ?? options.projectId,
      },
    };
  }

  get snapshot() {
    return this.#snapshot;
  }

  async getCompatibility() {
    return (
      (await this.#options.transport.getCompatibility?.({
        projectId: this.#options.projectId,
      })) ??
      createDefaultProjectSessionCompatibility(
        this.#options.compatibilityVersion
      )
    );
  }

  async initialize() {
    const persisted = await this.#options.storage.load();
    if (persisted === undefined) {
      return this.status(["No persisted project session snapshot found."]);
    }
    const compatibility = await this.getCompatibility();
    if (
      persisted.projectId !== this.#options.projectId ||
      isCompatible(persisted, compatibility) === false
    ) {
      await this.#options.storage.clear();
      this.#snapshot = undefined;
      this.#revision = undefined;
      return this.status([
        "Persisted project session snapshot is incompatible.",
      ]);
    }
    const { revision, ...snapshot } = persisted;
    this.#snapshot = { ...snapshot, compatibility };
    this.#revision = revision;
    return this.status();
  }

  async reset() {
    await this.#options.storage.clear();
    this.#snapshot = undefined;
    this.#revision = undefined;
    return this.status(
      ["Project session snapshot was reset."],
      "project-session.reset"
    );
  }

  status(
    messages: string[] = [],
    operationId = "project-session.status"
  ): ProjectSessionEnvelope<{
    loaded: boolean;
  }> {
    const diagnostics = messages.map(
      (message): ProjectSessionDiagnostic => ({
        level: "info",
        code: "SESSION_STATUS",
        message,
      })
    );
    return this.createEnvelope({
      source: "local",
      result: { loaded: this.#snapshot !== undefined },
      committed: false,
      contract: { ...emptyContract, id: operationId },
      diagnostics,
    });
  }

  async refresh(namespaces: readonly BuilderNamespace[]) {
    const snapshot = await this.fetchAndSave(namespaces);
    return this.createEnvelope({
      source: "remote",
      result: {
        refreshedNamespaces: namespaces,
      },
      committed: false,
      contract: {
        ...emptyContract,
        id: "project-session.refresh",
        readNamespaces: namespaces,
      },
      snapshot,
    });
  }

  async read<Result = unknown>(
    operationId: RuntimeOperationId,
    input: unknown,
    options: ProjectSessionReadOptions = {}
  ): Promise<ProjectSessionEnvelope<Result>> {
    const contract = getRuntimeOperationContract(operationId);
    if (contract.kind !== "read") {
      throw new Error(`Runtime operation "${operationId}" is not a read.`);
    }
    const snapshot = await this.ensureNamespaces(contract.readNamespaces);
    try {
      await this.assertPermit(options.permit);
      const result = await executeBuilderRuntimeOperation<Result>({
        id: operationId,
        state: snapshot.state,
        input,
        context: {
          ...this.#options.runtimeContext,
          projectVersion: snapshot.version,
        },
      });
      return this.createEnvelope({
        source: "local",
        result,
        committed: false,
        contract,
        snapshot,
      });
    } catch (error) {
      this.clearPermissionsAfterAuthorizationError(error);
      return this.createEnvelope({
        source: "local",
        result: undefined as unknown as Result,
        committed: false,
        contract,
        snapshot,
        diagnostics: [errorDiagnostic(error)],
      });
    }
  }

  async mutate<
    Result extends Record<string, unknown> = Record<string, unknown>,
  >(
    operationId: RuntimeOperationId,
    input: unknown,
    options: ProjectSessionMutationOptions = {}
  ): Promise<ProjectSessionEnvelope<Result>> {
    return (await this.enqueueMutation(() =>
      this.mutateUnqueued<Result>(operationId, input, options)
    )) as ProjectSessionEnvelope<Result>;
  }

  async executeServerOperation<Result = unknown>(
    descriptor: ProjectSessionServerOperationDescriptor,
    input: unknown
  ): Promise<ProjectSessionEnvelope<Result>> {
    if (this.#options.transport.executeServerOperation === undefined) {
      throw new Error(
        "Project session transport cannot execute server operations."
      );
    }
    const result = await this.#options.transport.executeServerOperation<Result>(
      {
        operationId: descriptor.id,
        input,
      }
    );
    const invalidated = descriptor.invalidatesNamespaces ?? [];
    let snapshot = this.#snapshot;
    let diagnostics: ProjectSessionDiagnostic[] = [];
    if (snapshot !== undefined && invalidated.length > 0) {
      snapshot = {
        ...snapshot,
        freshness: markBuilderStateNamespacesInvalidated(
          snapshot.freshness,
          invalidated,
          descriptor.id
        ),
      };
    }
    if (invalidated.length > 0) {
      const persisted = await this.#synchronizeAfterCommit({
        snapshot,
        namespaces: invalidated,
        diagnostics,
        refresh: descriptor.refetchInvalidatedNamespaces,
      });
      snapshot = persisted.snapshot;
      diagnostics = persisted.diagnostics;
    }
    return this.createEnvelope({
      source: "server",
      result,
      committed: true,
      contract: {
        ...emptyContract,
        id: descriptor.id,
        invalidatesNamespaces: invalidated,
      },
      snapshot,
      diagnostics,
    });
  }

  async markStale(namespaces: readonly BuilderNamespace[]) {
    for (const delay of [...projectSessionBusyRetryDelays, undefined]) {
      if (this.#snapshot === undefined) {
        return this.status(["Project session has no snapshot to mark stale."]);
      }
      this.#snapshot = {
        ...this.#snapshot,
        freshness: markBuilderStateNamespacesStale(
          this.#snapshot.freshness,
          namespaces
        ),
      };
      try {
        await this.saveSnapshot(this.#snapshot);
        return this.status(["Project session namespaces were marked stale."]);
      } catch (error) {
        if (delay === undefined || isProjectSessionBusyError(error) === false) {
          throw isProjectSessionBusyError(error)
            ? createProjectSessionBusyError(error)
            : error;
        }
        await wait(delay);
        await this.#reloadLocalSnapshot();
      }
    }
    throw createProjectSessionBusyError(undefined);
  }

  async #loadLocalSnapshot() {
    if (this.#snapshot !== undefined) {
      return this.#snapshot;
    }
    const initialized = await this.#options.storage.load();
    const compatibility = await this.getCompatibility();
    if (
      initialized !== undefined &&
      initialized.projectId === this.#options.projectId &&
      isCompatible(initialized, compatibility)
    ) {
      const { revision, ...snapshot } = initialized;
      this.#snapshot = { ...snapshot, compatibility };
      this.#revision = revision;
    }
    return this.#snapshot;
  }

  async #reloadLocalSnapshot() {
    this.#snapshot = undefined;
    this.#revision = undefined;
    return await this.#loadLocalSnapshot();
  }

  async ensureNamespaces(namespaces: readonly BuilderNamespace[]) {
    const snapshot = await this.#loadLocalSnapshot();
    const missing = getNamespacesNeedingRemote(snapshot, namespaces);
    if (missing.length === 0 && snapshot !== undefined) {
      return snapshot;
    }
    return await this.fetchAndSave(missing.length === 0 ? namespaces : missing);
  }

  async fetchAndSave(
    namespaces: readonly BuilderNamespace[],
    options: { retryOnBusy?: boolean; attempt?: number } = {}
  ): Promise<ProjectSessionSnapshot> {
    const current = await this.#loadLocalSnapshot();
    const compatibility = await this.getCompatibility();
    const remote = await this.#options.transport.fetchNamespaces({
      projectId: this.#options.projectId,
      namespaces,
    });
    const snapshot = mergeSnapshot({
      current,
      remote,
      namespaces,
      compatibilityVersion: this.#options.compatibilityVersion,
      compatibility,
    });
    try {
      await this.saveSnapshot(snapshot);
    } catch (error) {
      const attempt = options.attempt ?? 0;
      const retryDelay = projectSessionBusyRetryDelays[attempt];
      if (
        options.retryOnBusy === false ||
        isProjectSessionBusyError(error) === false ||
        retryDelay === undefined
      ) {
        throw isProjectSessionBusyError(error)
          ? createProjectSessionBusyError(error)
          : error;
      }
      await wait(retryDelay);
      await this.#reloadLocalSnapshot();
      return await this.fetchAndSave(namespaces, {
        retryOnBusy: true,
        attempt: attempt + 1,
      });
    }
    return snapshot;
  }

  async saveSnapshot(snapshot: ProjectSessionSnapshot) {
    const result = await this.#options.storage.save(snapshot, {
      expectedRevision: this.#revision,
    });
    this.#snapshot = snapshot;
    this.#revision = result?.revision;
  }

  async #synchronizeAfterCommit({
    snapshot,
    namespaces,
    diagnostics,
    refresh = false,
  }: {
    snapshot: ProjectSessionSnapshot | undefined;
    namespaces: readonly BuilderNamespace[];
    diagnostics: ProjectSessionDiagnostic[];
    refresh?: boolean;
  }): Promise<{
    snapshot: ProjectSessionSnapshot | undefined;
    diagnostics: ProjectSessionDiagnostic[];
  }> {
    try {
      if (refresh) {
        snapshot = await this.fetchAndSave(namespaces);
      } else if (snapshot !== undefined) {
        await this.saveSnapshot(snapshot);
      }
      return { snapshot, diagnostics };
    } catch {
      try {
        await this.#reloadLocalSnapshot();
        return {
          snapshot: await this.fetchAndSave(namespaces),
          diagnostics: [
            ...diagnostics,
            {
              level: "info",
              code: "COMMITTED_SESSION_RECONCILED",
              message:
                "The mutation committed and the local project session was refreshed after its snapshot could not be saved.",
            },
          ],
        };
      } catch (reconcileError) {
        const staleSnapshot =
          snapshot === undefined
            ? undefined
            : {
                ...snapshot,
                freshness: markBuilderStateNamespacesStale(
                  snapshot.freshness,
                  namespaces
                ),
              };
        if (this.#snapshot !== undefined) {
          this.#snapshot = {
            ...this.#snapshot,
            freshness: markBuilderStateNamespacesStale(
              this.#snapshot.freshness,
              namespaces
            ),
          };
        }
        return {
          snapshot: staleSnapshot,
          diagnostics: [
            ...diagnostics,
            {
              level: "warning",
              code: "COMMITTED_SESSION_RECONCILE_FAILED",
              message:
                "The mutation committed remotely, but the local project session could not be refreshed. Do not retry the mutation; refresh the session before the next change.",
              details: redactProjectSessionValue(reconcileError),
            },
          ],
        };
      }
    }
  }

  async mutateUnqueued<
    Result extends Record<string, unknown> = Record<string, unknown>,
  >(
    operationId: RuntimeOperationId,
    input: unknown,
    options: ProjectSessionMutationOptions
  ) {
    const contract = getRuntimeOperationContract(operationId);
    if (contract.kind !== "mutation") {
      throw new Error(`Runtime operation "${operationId}" is not a mutation.`);
    }
    const requiredNamespaces = mergeNamespaces(
      contract.readNamespaces,
      contract.writeNamespaces
    );
    const snapshot = await this.ensureNamespaces(requiredNamespaces);
    try {
      await this.assertPermit(options.permit);
      return await this.commitMutation({
        operationId,
        input,
        options,
        contract,
        snapshot,
      });
    } catch (error) {
      this.clearPermissionsAfterAuthorizationError(error);
      let latestSnapshot = snapshot;
      const diagnostics = [errorDiagnostic(error)];
      if (isVersionConflictError(error)) {
        try {
          latestSnapshot = await this.fetchAndSave(requiredNamespaces);
          diagnostics.push({
            level: "info",
            code: "CONFLICT_REFRESHED",
            message:
              "Remote build changed. Required namespaces were refreshed; rerun the operation against the latest snapshot.",
          });
          if (contract.retryOnConflict && options.dryRun !== true) {
            return await this.commitMutation({
              operationId,
              input,
              options,
              contract,
              snapshot: latestSnapshot,
              diagnostics: [
                ...diagnostics,
                {
                  level: "info",
                  code: "CONFLICT_RETRY",
                  message:
                    "Operation is retry-safe and was retried against the refreshed snapshot.",
                },
              ],
            });
          }
        } catch (refreshError) {
          diagnostics.push(errorDiagnostic(refreshError));
        }
      }
      return this.createEnvelope({
        source: "local",
        result: undefined as unknown as Result,
        committed: false,
        contract,
        snapshot: latestSnapshot,
        diagnostics,
      });
    }
  }

  async commitMutation<
    Result extends Record<string, unknown> = Record<string, unknown>,
  >({
    operationId,
    input,
    options,
    contract,
    snapshot,
    diagnostics = [],
  }: {
    operationId: RuntimeOperationId;
    input: unknown;
    options: ProjectSessionMutationOptions;
    contract: RuntimeOperationContract;
    snapshot: ProjectSessionSnapshot;
    diagnostics?: ProjectSessionDiagnostic[];
  }) {
    const mutation = await executeBuilderRuntimeOperation<
      BuilderRuntimeMutation<Result>
    >({
      id: operationId,
      state: snapshot.state,
      input,
      context: {
        ...this.#options.runtimeContext,
        projectVersion: snapshot.version,
      },
    });
    if (mutation.noop) {
      return this.createEnvelope({
        source: "local",
        result: mutation.result,
        committed: false,
        contract,
        snapshot,
        diagnostics,
      });
    }
    const transaction: BuilderPatchTransaction = {
      id: this.#options.runtimeContext.createId(),
      payload: mutation.payload,
    };
    if (options.dryRun) {
      return this.createEnvelope({
        source: "dry-run",
        result: mutation.result,
        committed: false,
        contract,
        snapshot,
        transaction,
        diagnostics: [
          ...diagnostics,
          {
            level: "info",
            code: "DRY_RUN",
            message: "Mutation was planned locally and was not committed.",
          },
        ],
      });
    }
    if (hasGeneratedRecordWritePatch(mutation.payload)) {
      return await this.executeServerOperation<Result>(
        {
          id: operationId,
          invalidatesNamespaces: mutation.invalidatesNamespaces,
          refetchInvalidatedNamespaces: true,
        },
        input
      );
    }
    const commit = await this.#options.transport.commitPatch({
      projectId: snapshot.projectId,
      buildId: snapshot.buildId,
      baseVersion: snapshot.version,
      transactions: [transaction],
    });
    const applied = applyBuilderPatchTransactions(snapshot.state, [
      transaction,
    ]);
    const loadedAt = new Date().toISOString();
    const updatedNamespaces = [
      ...new Set(mutation.payload.map((change) => change.namespace)),
    ];
    const committedSnapshot: ProjectSessionSnapshot = {
      ...snapshot,
      version: commit.version,
      state: applied.state,
      freshness: markBuilderStateNamespacesInvalidated(
        mergeFreshness({
          current: snapshot.freshness,
          state: applied.state,
          namespaces: updatedNamespaces,
          version: commit.version,
          loadedAt,
          source: "local",
        }),
        mutation.invalidatesNamespaces,
        operationId
      ),
    };
    const persisted = await this.#synchronizeAfterCommit({
      snapshot: committedSnapshot,
      namespaces: mergeNamespaces(
        contract.readNamespaces,
        contract.writeNamespaces,
        mutation.invalidatesNamespaces
      ),
      diagnostics,
    });
    return this.createEnvelope({
      source: "local",
      result: mutation.result,
      committed: true,
      contract: {
        ...contract,
        invalidatesNamespaces: mutation.invalidatesNamespaces,
      },
      snapshot: persisted.snapshot,
      transaction,
      diagnostics: persisted.diagnostics,
    });
  }

  enqueueMutation<Result>(
    task: () => Promise<ProjectSessionEnvelope<Result>>
  ): Promise<ProjectSessionEnvelope<Result>> {
    const run = this.#mutationQueue.then(task, task);
    this.#mutationQueue = run.catch(() => undefined);
    return run;
  }

  async getPermissions({ force = false }: { force?: boolean } = {}) {
    if (force === false && this.#permissions !== undefined) {
      return this.#permissions;
    }
    if (this.#options.transport.getPermissions === undefined) {
      throw new Error("Project session transport cannot read permissions.");
    }
    this.#permissions = await this.#options.transport.getPermissions({
      projectId: this.#options.projectId,
    });
    return this.#permissions;
  }

  async assertPermit(permit: BuilderApiCapability | undefined) {
    if (permit === undefined) {
      return;
    }
    const permissions = await this.getPermissions();
    if (hasProjectSessionPermit(permissions, permit) === false) {
      throw new Error(
        `Authorization token does not have ${permit} permission.`
      );
    }
  }

  clearPermissionsAfterAuthorizationError(error: unknown) {
    if (shouldRefreshPermissionsAfterError(error)) {
      this.#permissions = undefined;
    }
  }

  createEnvelope<Result>({
    source,
    result,
    committed,
    contract,
    snapshot = this.#snapshot,
    diagnostics = [],
    transaction,
  }: {
    source: ProjectSessionSource;
    result: Result;
    committed: boolean;
    contract: ProjectSessionEnvelopeContract;
    snapshot?: ProjectSessionSnapshot;
    diagnostics?: ProjectSessionDiagnostic[];
    transaction?: BuilderPatchTransaction;
  }): ProjectSessionEnvelope<Result> {
    return {
      operationId: contract.id,
      projectId: this.#options.projectId,
      buildId: snapshot?.buildId,
      version: snapshot?.version,
      source,
      result,
      state: {
        committed,
        freshness: snapshot?.freshness ?? {},
        compatibility: snapshot?.compatibility,
      },
      namespaces: {
        read: contract.readNamespaces,
        write: contract.writeNamespaces,
        invalidated: contract.invalidatesNamespaces,
        missing:
          snapshot === undefined
            ? [...contract.readNamespaces, ...contract.writeNamespaces]
            : getMissingBuilderStateNamespaces(snapshot.state, [
                ...contract.readNamespaces,
                ...contract.writeNamespaces,
              ]),
      },
      diagnostics,
      transaction,
    };
  }
}

const emptyContract: ProjectSessionEnvelopeContract = {
  id: "project-session.status",
  readNamespaces: [],
  writeNamespaces: [],
  invalidatesNamespaces: [],
};

export const createProjectSession = (options: ProjectSessionOptions) =>
  new ProjectSession(options);
