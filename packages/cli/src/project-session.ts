import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { cwd } from "node:process";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import * as httpClient from "@webstudio-is/http-client";
import { publicApiOperations } from "@webstudio-is/protocol";
import {
  createProjectSession,
  createDefaultProjectSessionCompatibility,
  type ProjectSessionCompatibility,
  type ProjectSessionPersistedSnapshot,
  type ProjectSessionPermissions,
  type ProjectSessionRemoteSnapshot,
  type ProjectSessionStorage,
  type ProjectSessionTransport,
} from "@webstudio-is/project-build/project-session";
import type { BuilderNamespace } from "@webstudio-is/project-build/contracts/namespaces";
import {
  createBuilderStateFromBuildData,
  createBuilderStateFromSerializedSnapshot,
  createSerializedBuilderStateSnapshotFromState,
  type BuilderBuildDataSnapshot,
  type SerializedBuilderStateSnapshot,
} from "@webstudio-is/project-build/state/adapters";
import type { BuilderStateFreshness } from "@webstudio-is/project-build/state/freshness";
import { LOCAL_CONFIG_FILE } from "./config";
import { getStableErrorCode } from "./error-codes";
import { writeFileAtomic } from "./fs-utils";

type ApiConnection = {
  projectId: string;
  origin: string;
  authToken: string;
  headers?: Record<string, string | undefined>;
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
  folders?: unknown;
  meta?: unknown;
  compiler?: unknown;
  redirects?: unknown;
  dataSources?: BuilderBuildDataSnapshot["dataSources"];
  variables?: BuilderBuildDataSnapshot["dataSources"];
};

type PersistedCliProjectSessionSnapshot = Omit<
  ProjectSessionPersistedSnapshot,
  "state"
> & {
  state: SerializedBuilderStateSnapshot;
};

const sessionFile = join(dirname(LOCAL_CONFIG_FILE), "project-session.json");
const compatibilityVersion = "cli-project-session-v1";

const createCliProjectSessionCompatibility = (
  connection: ApiConnection
): ProjectSessionCompatibility => ({
  ...createDefaultProjectSessionCompatibility(compatibilityVersion),
  apiCompatibilityVersion: connection.headers?.["x-webstudio-client-version"],
});

const toPublicApiInclude = (namespaces: readonly BuilderNamespace[]) => [
  ...new Set(
    namespaces.flatMap((namespace) => {
      if (namespace === "dataSources") {
        return ["variables"];
      }
      if (namespace === "pages") {
        return ["pages", "folders"];
      }
      return [namespace];
    })
  ),
];

const toPages = (snapshot: PublicBuildSnapshot) => {
  if (snapshot.pages === undefined) {
    return undefined;
  }
  return migratePages({
    homePageId: snapshot.homePageId,
    rootFolderId: snapshot.rootFolderId,
    pages: snapshot.pages,
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
  path = join(cwd(), sessionFile)
): ProjectSessionStorage => ({
  async load() {
    try {
      const value = JSON.parse(await readFile(path, "utf-8"));
      return parsePersistedSnapshot(value);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: unknown }).code === "ENOENT"
      ) {
        return undefined;
      }
      throw error;
    }
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
    const snapshot = (await withMappedRemoteError(() =>
      getBuildSnapshot({
        ...connection,
        include: toPublicApiInclude(namespaces),
      })
    )) as PublicBuildSnapshot;
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
  storage = createCliProjectSessionStorage(),
  executeServerOperation,
  getPermissions,
  createId = () => crypto.randomUUID(),
  now = () => new Date(),
}: {
  connection: ApiConnection;
  storage?: ProjectSessionStorage;
  executeServerOperation?: ProjectSessionTransport["executeServerOperation"];
  getPermissions?: ProjectSessionTransport["getPermissions"];
  createId?: () => string;
  now?: () => Date;
}) =>
  createProjectSession({
    projectId: connection.projectId,
    transport: createCliProjectSessionTransport({
      connection,
      executeServerOperation,
      getPermissions,
    }),
    storage,
    compatibilityVersion,
    runtimeContext: { createId, now },
  });

export type CliProjectSession = ReturnType<typeof createCliProjectSession>;

export type CliProjectSessionSnapshot = {
  projectId: string;
  buildId: string;
  version: number;
  freshness: BuilderStateFreshness;
};
