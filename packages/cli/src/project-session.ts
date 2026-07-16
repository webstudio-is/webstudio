import { rm } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import {
  migratePages,
  serializePages,
} from "@webstudio-is/project-migrations/pages";
import * as httpClient from "@webstudio-is/http-client";
import {
  bundleVersion,
  getPublicBuildIncludes,
  publicApiContractVersion,
  publicApiOperationRequiresServerSupport,
  publicApiOperations,
  type PublishedProjectBundle,
} from "@webstudio-is/protocol";
import { getHomePage } from "@webstudio-is/sdk";
import {
  createProjectSession,
  createDefaultProjectSessionCompatibility,
  serializeRestorePointTransaction,
  type ProjectSessionCompatibility,
  type ProjectSessionPersistedSnapshot,
  type ProjectSessionPermissions,
  type ProjectSessionRemoteSnapshot,
  type ProjectSessionRestorePointSummary,
  type ProjectSessionSnapshot,
  type ProjectSessionStorage,
  type ProjectSessionTransport,
} from "@webstudio-is/project-build/project-session";
import type { BuilderNamespace } from "@webstudio-is/project-build/contracts";
import {
  createBuilderStateFromBuildData,
  createBuilderStateFromSerializedSnapshot,
  createSerializedBuilderBuildDataFromState,
  createSerializedBuilderStateSnapshotFromState,
  type BuilderBuildDataSnapshot,
  type SerializedBuilderStateSnapshot,
} from "@webstudio-is/project-build/state";
import { removeLegacyProjectSettingsFromPages } from "@webstudio-is/project-build";
import type { BuilderStateFreshness } from "@webstudio-is/project-build/state";
import { getLocalProjectStateDirectory, LOCAL_DATA_FILE } from "./config";
import type { ApiConnection } from "./api-connection";
import { getStableErrorCode } from "./error-codes";
import { loadJSONFile, withFileLock, writeFileAtomic } from "./fs-utils";
import { isPlainRecord } from "./type-utils";

export type CliServerApiContract = {
  clientVersion: string;
  serverVersion?: string;
  supportedOperationIds: ReadonlySet<string>;
  missingServerOperationIds: readonly string[];
  negotiated: boolean;
};

export const getCliServerApiContract = async (
  connection: ApiConnection,
  getProjectPermissions = httpClient.getProjectPermissions
): Promise<CliServerApiContract> => {
  const permissions = (await getProjectPermissions(connection)) as unknown;
  const apiContract = isPlainRecord(permissions)
    ? permissions.apiContract
    : undefined;
  const serverVersion =
    isPlainRecord(apiContract) && typeof apiContract.version === "string"
      ? apiContract.version
      : undefined;
  const operationIds =
    isPlainRecord(apiContract) && Array.isArray(apiContract.operationIds)
      ? apiContract.operationIds.filter(
          (operationId): operationId is string =>
            typeof operationId === "string"
        )
      : [];
  const supportedOperationIds = new Set(operationIds);
  const missingServerOperationIds = publicApiOperations.flatMap((operation) =>
    publicApiOperationRequiresServerSupport(operation) &&
    supportedOperationIds.has(operation.id) === false
      ? [operation.id]
      : []
  );
  return {
    clientVersion: publicApiContractVersion,
    serverVersion,
    supportedOperationIds,
    missingServerOperationIds,
    negotiated: serverVersion !== undefined,
  };
};

export const getSupportedPublicApiOperations = (
  contract: CliServerApiContract
) =>
  publicApiOperations.filter((operation) => {
    if (contract.negotiated === false) {
      return publicApiOperationRequiresServerSupport(operation) === false;
    }
    return (
      publicApiOperationRequiresServerSupport(operation) === false ||
      contract.supportedOperationIds.has(operation.id)
    );
  });

export const assertCliServerOperationSupported = (
  operationId: string,
  contract: CliServerApiContract
) => {
  if (contract.supportedOperationIds.has(operationId)) {
    return;
  }
  const serverVersion = contract.serverVersion ?? "unavailable (legacy server)";
  throw Object.assign(
    new Error(
      `The configured Webstudio API does not advertise server operation "${operationId}". CLI contract: ${contract.clientVersion}. Server contract: ${serverVersion}. Run this command with the latest CLI once; if it still appears, retry after the Webstudio API deployment is updated.`
    ),
    { code: "API_CONTRACT_MISMATCH" }
  );
};

type PublicBuildSnapshot = Omit<
  BuilderBuildDataSnapshot,
  "dataSources" | "pages"
> & {
  projectId: string;
  buildId: string;
  version: number;
  homePageId?: string;
  rootFolderId?: string;
  pages?: unknown;
  pageTemplates?: unknown;
  folders?: unknown;
  meta?: unknown;
  compiler?: unknown;
  redirects?: unknown;
  projectSettings?: BuilderBuildDataSnapshot["projectSettings"];
  dataSources?: BuilderBuildDataSnapshot["dataSources"];
  variables?: BuilderBuildDataSnapshot["dataSources"];
};

type PersistedCliProjectSessionSnapshot = Omit<
  ProjectSessionPersistedSnapshot,
  "state"
> & {
  state: SerializedBuilderStateSnapshot;
};

export const getCliProjectSessionFile = (
  projectRoot = cwd(),
  projectId?: string
) =>
  join(
    getLocalProjectStateDirectory(projectRoot, projectId),
    "project-session.json"
  );

export const getCliProjectRestorePointsFile = (
  projectRoot = cwd(),
  projectId?: string
) =>
  join(
    getLocalProjectStateDirectory(projectRoot, projectId),
    "restore-points.json"
  );
const compatibilityVersion = "cli-project-session-v1";

const createCliProjectSessionCompatibility = (
  connection: ApiConnection
): ProjectSessionCompatibility => ({
  ...createDefaultProjectSessionCompatibility(compatibilityVersion),
  apiCompatibilityVersion: connection.headers?.["x-webstudio-client-version"],
});

const isUnsupportedProjectSettingsIncludeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("invalid_enum_value") &&
    message.includes('received "projectSettings"')
  );
};

const getLegacyPublicApiInclude = (namespaces: readonly BuilderNamespace[]) =>
  getPublicBuildIncludes([
    ...namespaces.filter((namespace) => namespace !== "projectSettings"),
    "pages",
  ]);

const toPages = (snapshot: PublicBuildSnapshot) => {
  if (snapshot.pages === undefined) {
    return undefined;
  }
  return migratePages({
    homePageId: snapshot.homePageId,
    rootFolderId: snapshot.rootFolderId,
    pages: snapshot.pages,
    pageTemplates: snapshot.pageTemplates,
    folders: snapshot.folders,
    meta: snapshot.meta,
    compiler: snapshot.compiler,
    redirects: snapshot.redirects,
  });
};

const toRemoteSnapshot = (
  snapshot: PublicBuildSnapshot
): ProjectSessionRemoteSnapshot => ({
  projectId: snapshot.projectId,
  buildId: snapshot.buildId,
  version: snapshot.version,
  state: createBuilderStateFromBuildData({
    ...snapshot,
    pages: toPages(snapshot),
    dataSources: snapshot.dataSources ?? snapshot.variables ?? [],
  }),
});

const publicOperationById = new Map(
  publicApiOperations.map((operation) => [operation.id, operation])
);

const executePublicServerOperation = async ({
  connection,
  operationId,
  input,
}: {
  connection: ApiConnection;
  operationId: string;
  input: unknown;
}) => {
  const operation = publicOperationById.get(operationId);
  if (operation === undefined) {
    throw new Error(`Unknown public API operation "${operationId}".`);
  }
  const client = httpClient[operation.client as keyof typeof httpClient] as
    | ((input: Record<string, unknown>) => Promise<unknown>)
    | undefined;
  if (typeof client !== "function") {
    throw new Error(
      `Public API operation "${operationId}" has no http-client function.`
    );
  }
  return await client({
    ...connection,
    ...(input as Record<string, unknown>),
    projectId: connection.projectId,
  });
};

const withMappedRemoteError = async <Result>(task: () => Promise<Result>) => {
  try {
    return await task();
  } catch (error) {
    const code = getStableErrorCode(error);
    if (code === undefined) {
      throw error;
    }
    const mapped = new Error(
      error instanceof Error ? error.message : String(error)
    ) as Error & { code: string };
    mapped.name = code;
    mapped.code = code;
    throw mapped;
  }
};

const parsePersistedSnapshot = (
  value: PersistedCliProjectSessionSnapshot
): ProjectSessionPersistedSnapshot => ({
  ...value,
  state: createBuilderStateFromSerializedSnapshot(value.state),
});

const serializePersistedSnapshot = (
  snapshot: ProjectSessionPersistedSnapshot
): PersistedCliProjectSessionSnapshot => ({
  ...snapshot,
  state: createSerializedBuilderStateSnapshotFromState(snapshot.state),
});

export const createCliProjectSessionStorage = (
  path = getCliProjectSessionFile()
): ProjectSessionStorage => ({
  async load() {
    const value = await loadJSONFile<PersistedCliProjectSessionSnapshot>(path);
    return value === null ? undefined : parsePersistedSnapshot(value);
  },
  async save(snapshot, options) {
    const current = await this.load();
    if (
      options.expectedRevision !== undefined &&
      current?.revision !== options.expectedRevision
    ) {
      throw new Error("Project session snapshot changed on disk.");
    }
    const revision = crypto.randomUUID();
    await writeFileAtomic(
      path,
      `${JSON.stringify(
        serializePersistedSnapshot({ ...snapshot, revision }),
        undefined,
        2
      )}\n`
    );
    return { revision };
  },
  async clear() {
    await rm(path, { force: true });
  },
});

type PersistedCliProjectRestorePoint = Pick<
  ProjectSessionRestorePointSummary,
  "id" | "name" | "createdAt"
> & {
  snapshot: PersistedCliProjectSessionSnapshot;
};

type PersistedCliProjectRestorePoints = {
  version: 1;
  points: PersistedCliProjectRestorePoint[];
};

const maxCliProjectRestorePoints = 20;

export const createCliProjectRestorePointStorage = (
  path = getCliProjectRestorePointsFile(),
  maxPoints = maxCliProjectRestorePoints
) => {
  if (Number.isInteger(maxPoints) === false || maxPoints < 1) {
    throw new Error("Restore point retention must be a positive integer");
  }
  const load = async (): Promise<PersistedCliProjectRestorePoints> =>
    (await loadJSONFile<PersistedCliProjectRestorePoints>(path)) ?? {
      version: 1,
      points: [],
    };
  const getSummary = ({
    id,
    name,
    createdAt,
    snapshot,
  }: PersistedCliProjectRestorePoint): ProjectSessionRestorePointSummary => ({
    id,
    name,
    createdAt,
    projectId: snapshot.projectId,
    buildId: snapshot.buildId,
    version: snapshot.version,
  });
  const save = async (points: PersistedCliProjectRestorePoint[]) => {
    await writeFileAtomic(
      path,
      `${JSON.stringify({ version: 1, points }, undefined, 2)}\n`
    );
  };
  return {
    async create(name: string, snapshot: ProjectSessionSnapshot) {
      return await withFileLock(path, async () => {
        const persisted = await load();
        const point: PersistedCliProjectRestorePoint = {
          id: crypto.randomUUID(),
          name,
          createdAt: new Date().toISOString(),
          snapshot: serializePersistedSnapshot(snapshot),
        };
        await save([...persisted.points, point].slice(-maxPoints));
        return getSummary(point);
      });
    },
    async list() {
      return (await load()).points.map(getSummary);
    },
    async get(id: string) {
      const point = (await load()).points.find(
        (candidate) => candidate.id === id
      );
      if (point === undefined) {
        return;
      }
      return parsePersistedSnapshot(point.snapshot);
    },
    async delete(id: string) {
      return await withFileLock(path, async () => {
        const persisted = await load();
        const points = persisted.points.filter((point) => point.id !== id);
        if (points.length === persisted.points.length) {
          return false;
        }
        await save(points);
        return true;
      });
    },
  };
};

export const createCliProjectSessionTransport = ({
  connection,
  executeServerOperation,
  getBuildSnapshot = httpClient.getBuildSnapshot,
  getPermissions,
}: {
  connection: ApiConnection;
  executeServerOperation?: ProjectSessionTransport["executeServerOperation"];
  getBuildSnapshot?: typeof httpClient.getBuildSnapshot;
  getPermissions?: ProjectSessionTransport["getPermissions"];
}): ProjectSessionTransport => ({
  async getCompatibility() {
    return createCliProjectSessionCompatibility(connection);
  },
  async fetchNamespaces({ namespaces }) {
    const fetchSnapshot = (include: string[]) =>
      withMappedRemoteError(() =>
        getBuildSnapshot({
          ...connection,
          include,
        })
      ) as Promise<PublicBuildSnapshot>;
    let snapshot: PublicBuildSnapshot;
    try {
      snapshot = await fetchSnapshot(getPublicBuildIncludes(namespaces));
    } catch (error) {
      if (
        namespaces.includes("projectSettings") === false ||
        isUnsupportedProjectSettingsIncludeError(error) === false
      ) {
        throw error;
      }
      snapshot = await fetchSnapshot(getLegacyPublicApiInclude(namespaces));
    }
    return toRemoteSnapshot(snapshot);
  },
  async commitPatch({ baseVersion, transactions }) {
    return (await withMappedRemoteError(() =>
      httpClient.applyBuildPatch({
        ...connection,
        baseVersion,
        transactions,
      })
    )) as { version: number };
  },
  async commitRestorePoint({ baseVersion, transactions }) {
    return (await withMappedRemoteError(() =>
      httpClient.applyRestorePointPatch({
        ...connection,
        baseVersion,
        transactions: transactions.map(serializeRestorePointTransaction),
      })
    )) as { version: number };
  },
  getPermissions:
    getPermissions ??
    (async () => {
      const permissions =
        await withMappedRemoteError<ProjectSessionPermissions>(
          () =>
            httpClient.getProjectPermissions(
              connection
            ) as Promise<ProjectSessionPermissions>
        );
      return {
        canView: permissions.canView,
        canEdit: permissions.canEdit,
        canBuild: permissions.canBuild,
        canAdmin: permissions.canAdmin,
        canUseApi: permissions.canUseApi,
      };
    }),
  executeServerOperation:
    executeServerOperation ??
    (async <Result>({
      operationId,
      input,
    }: {
      operationId: string;
      input: unknown;
    }) =>
      (await withMappedRemoteError(() =>
        executePublicServerOperation({ connection, operationId, input })
      )) as Result),
});

export const createCliProjectSession = ({
  connection,
  storage,
  projectRoot,
  sessionProjectId,
  executeServerOperation,
  getPermissions,
}: {
  connection: ApiConnection;
  storage?: ProjectSessionStorage;
  projectRoot?: string;
  sessionProjectId?: string;
  executeServerOperation?: ProjectSessionTransport["executeServerOperation"];
  getPermissions?: ProjectSessionTransport["getPermissions"];
}) =>
  createProjectSession({
    projectId: connection.projectId,
    transport: createCliProjectSessionTransport({
      connection,
      executeServerOperation,
      getPermissions,
    }),
    storage:
      storage ??
      createCliProjectSessionStorage(
        getCliProjectSessionFile(projectRoot, sessionProjectId)
      ),
    compatibilityVersion,
  });

export type CliProjectSession = ReturnType<typeof createCliProjectSession>;

export type CliProjectSessionSnapshot = {
  projectId: string;
  buildId: string;
  version: number;
  freshness: BuilderStateFreshness;
};

export const createLocalProjectBundleFromSessionSnapshot = (
  snapshot: ProjectSessionSnapshot,
  options: { origin?: string } = {}
): PublishedProjectBundle => {
  const pages = snapshot.state.pages;
  if (pages === undefined) {
    throw new Error("Project session pages namespace is missing.");
  }
  const projectSettings = snapshot.state.projectSettings;
  const persistedPages = removeLegacyProjectSettingsFromPages(
    structuredClone(pages)
  );
  const serializedPages = serializePages(persistedPages);
  const { pages: _pages, ...serializedBuildState } =
    createSerializedBuilderBuildDataFromState(snapshot.state);
  const homePage = getHomePage(persistedPages);
  return {
    bundleVersion,
    origin: options.origin,
    projectDomain: "local-preview",
    projectTitle:
      projectSettings?.meta.siteName ??
      persistedPages.meta?.siteName ??
      "Webstudio Preview",
    page: homePage,
    pages: Array.from(persistedPages.pages.values()),
    assets: Array.from(snapshot.state.assets?.values() ?? []),
    assetFolders: Array.from(snapshot.state.assetFolders?.values() ?? []),
    build: {
      id: snapshot.buildId,
      projectId: snapshot.projectId,
      version: snapshot.version,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...serializedBuildState,
      pages: serializedPages,
    },
  };
};

export const writeCliProjectSessionDataFile = async (
  snapshot: ProjectSessionSnapshot,
  path = join(cwd(), LOCAL_DATA_FILE),
  options: { origin?: string } = {}
) => {
  const data = createLocalProjectBundleFromSessionSnapshot(snapshot, options);
  await writeFileAtomic(path, `${JSON.stringify(data, undefined, 2)}\n`);
};
