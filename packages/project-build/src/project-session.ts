import type {
  RuntimeOperationContract,
  RuntimeOperationId,
} from "./contracts/builder-runtime";
import { runtimeOperationContracts } from "./contracts/builder-runtime";
import type { BuilderNamespace } from "./contracts/namespaces";
import type { BuilderPatchTransaction } from "./contracts/patch";
import type { BuilderRuntimeContext } from "./runtime/context";
import { BuilderRuntimeError } from "./runtime/errors";
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
} from "./state/freshness";
import { applyBuilderPatchTransactions } from "./state/patch";

type ProjectSessionSource = "local" | "remote" | "dry-run" | "server";
type ProjectSessionDiagnosticLevel = "info" | "warning" | "error";

export type ProjectSessionDiagnostic = {
  level: ProjectSessionDiagnosticLevel;
  code: string;
  message: string;
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

export type ProjectSessionPermit = "api" | "view" | "build" | "edit" | "admin";

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
  runtimeContext: BuilderRuntimeContext;
  compatibilityVersion?: string;
};

export type ProjectSessionEnvelope<Result = unknown> = {
  operationId: string;
  projectId: string;
  buildId?: string;
  version?: number;
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

export type ProjectSessionMutationOptions = {
  dryRun?: boolean;
  permit?: ProjectSessionPermit;
};

export type ProjectSessionReadOptions = {
  permit?: ProjectSessionPermit;
};

export type ProjectSessionServerOperationDescriptor = {
  id: string;
  invalidatesNamespaces?: readonly BuilderNamespace[];
  refetchInvalidatedNamespaces?: boolean;
};

const defaultCompatibilityVersion = "project-session-v1";
const defaultRuntimeContractVersion = `runtime-contracts:${runtimeOperationContracts
  .map((contract) => contract.id)
  .join(",")}`;
const defaultProjectSchemaVersion = "builder-state-v1";

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

const createFreshness = (
  state: BuilderState,
  version: number
): BuilderStateFreshness => createBuilderStateFreshness({ state, version });

const mergeFreshness = ({
  current,
  state,
  namespaces,
  version,
}: {
  current: BuilderStateFreshness | undefined;
  state: BuilderState;
  namespaces: readonly BuilderNamespace[];
  version: number;
}): BuilderStateFreshness => {
  const next =
    current === undefined
      ? createBuilderStateFreshness({ state })
      : { ...current };
  const fresh = createFreshness(state, version);
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

const errorDiagnostic = (error: unknown): ProjectSessionDiagnostic => ({
  level: "error",
  code: getProjectSessionErrorCode(error),
  message: error instanceof Error ? error.message : "Unknown error",
  details: redactProjectSessionValue(error),
});

const shouldRefreshPermissionsAfterError = (error: unknown) => {
  const code = getProjectSessionErrorCode(error);
  return (
    code === "UNAUTHORIZED" || code === "FORBIDDEN" || code === "PLAN_REQUIRED"
  );
};

const isVersionConflictError = (error: unknown) =>
  getProjectSessionErrorCode(error) === "CONFLICT";

export const hasProjectSessionPermit = (
  permissions: ProjectSessionPermissions,
  permit: ProjectSessionPermit
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
  #options: Required<Pick<ProjectSessionOptions, "compatibilityVersion">> &
    ProjectSessionOptions;

  constructor(options: ProjectSessionOptions) {
    this.#options = {
      ...options,
      compatibilityVersion:
        options.compatibilityVersion ?? defaultCompatibilityVersion,
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
    return this.status(["Project session snapshot was reset."]);
  }

  status(messages: string[] = []): ProjectSessionEnvelope<{
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
      contract: emptyContract,
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
      const result = executeBuilderRuntimeOperation<Result>({
        id: operationId,
        state: snapshot.state,
        input,
        context: this.#options.runtimeContext,
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
    if (snapshot !== undefined && invalidated.length > 0) {
      snapshot = {
        ...snapshot,
        freshness: markBuilderStateNamespacesInvalidated(
          snapshot.freshness,
          invalidated,
          descriptor.id
        ),
      };
      await this.saveSnapshot(snapshot);
    }
    if (descriptor.refetchInvalidatedNamespaces && invalidated.length > 0) {
      snapshot = await this.fetchAndSave(invalidated);
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
    });
  }

  async markStale(namespaces: readonly BuilderNamespace[]) {
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
    await this.saveSnapshot(this.#snapshot);
    return this.status(["Project session namespaces were marked stale."]);
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

  async ensureNamespaces(namespaces: readonly BuilderNamespace[]) {
    const snapshot = await this.#loadLocalSnapshot();
    const missing = getNamespacesNeedingRemote(snapshot, namespaces);
    if (missing.length === 0 && snapshot !== undefined) {
      return snapshot;
    }
    return await this.fetchAndSave(missing.length === 0 ? namespaces : missing);
  }

  async fetchAndSave(namespaces: readonly BuilderNamespace[]) {
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
    await this.saveSnapshot(snapshot);
    return snapshot;
  }

  async saveSnapshot(snapshot: ProjectSessionSnapshot) {
    const result = await this.#options.storage.save(snapshot, {
      expectedRevision: this.#revision,
    });
    this.#snapshot = snapshot;
    this.#revision = result?.revision;
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
    const requiredNamespaces = [
      ...new Set([...contract.readNamespaces, ...contract.writeNamespaces]),
    ];
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
    const mutation = executeBuilderRuntimeOperation<
      BuilderRuntimeMutation<Result>
    >({
      id: operationId,
      state: snapshot.state,
      input,
      context: this.#options.runtimeContext,
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
    const commit = await this.#options.transport.commitPatch({
      projectId: snapshot.projectId,
      buildId: snapshot.buildId,
      baseVersion: snapshot.version,
      transactions: [transaction],
    });
    const applied = applyBuilderPatchTransactions(snapshot.state, [
      transaction,
    ]);
    const committedSnapshot: ProjectSessionSnapshot = {
      ...snapshot,
      version: commit.version,
      state: applied.state,
      freshness: createBuilderStateFreshness({
        state: applied.state,
        version: commit.version,
        invalidatedNamespaces: mutation.invalidatesNamespaces,
        invalidatedBy: operationId,
      }),
    };
    await this.saveSnapshot(committedSnapshot);
    return this.createEnvelope({
      source: "remote",
      result: mutation.result,
      committed: true,
      contract: {
        ...contract,
        invalidatesNamespaces: mutation.invalidatesNamespaces,
      },
      snapshot: committedSnapshot,
      transaction,
      diagnostics,
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

  async assertPermit(permit: ProjectSessionPermit | undefined) {
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
    contract: Pick<
      RuntimeOperationContract,
      "id" | "readNamespaces" | "writeNamespaces" | "invalidatesNamespaces"
    >;
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

const emptyContract: RuntimeOperationContract = {
  id: "project-session.status",
  kind: "read",
  readNamespaces: [],
  writeNamespaces: [],
  invalidatesNamespaces: [],
  retryOnConflict: false,
};

export const createProjectSession = (options: ProjectSessionOptions) =>
  new ProjectSession(options);
