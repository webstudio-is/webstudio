import {
  getPublicApiOperation,
  publicApiOperationRequiresServerSupport,
  type PublicApiCommand,
} from "@webstudio-is/protocol";
import type { RuntimeOperationId } from "@webstudio-is/project-build/contracts";
import type { BuilderNamespace } from "@webstudio-is/project-build/contracts";
import {
  serializeProjectSessionMeta,
  type ProjectSessionEnvelope,
  type ProjectSessionDiagnostic,
} from "@webstudio-is/project-build/project-session";
import {
  assertCliServerOperationSupported,
  createCliProjectSession,
  getCliServerApiContract,
} from "./project-session";

export type ProjectSessionApiConnection = {
  projectId: string;
  origin: string;
  authToken: string;
  headers?: Record<string, string | undefined>;
};

export type ProjectSessionApiCommand = PublicApiCommand;

type CreateProjectSession = typeof createCliProjectSession;

const uniqueNamespaces = (
  namespaces: readonly BuilderNamespace[]
): readonly BuilderNamespace[] => [...new Set(namespaces)];

const getSessionError = (envelope: {
  diagnostics: readonly ProjectSessionDiagnostic[];
}) => envelope.diagnostics.find((diagnostic) => diagnostic.level === "error");

const createProjectSessionApiError = (
  diagnostic: Pick<ProjectSessionDiagnostic, "code" | "message" | "issues">
) => {
  const error = new Error(diagnostic.message) as Error & {
    code?: string;
    issues?: ProjectSessionDiagnostic["issues"];
  };
  if (diagnostic.code !== undefined) {
    error.name = diagnostic.code;
    error.code = diagnostic.code;
  }
  if (diagnostic.issues !== undefined) {
    error.issues = diagnostic.issues;
  }
  return error;
};

const withProjectId = (
  input: unknown,
  projectId: string
): Record<string, unknown> => ({
  ...(typeof input === "object" && input !== null
    ? (input as Record<string, unknown>)
    : {}),
  projectId,
});

const snapshotMetadataKeys = new Set([
  "projectId",
  "buildId",
  "version",
  "homePageId",
  "rootFolderId",
]);

const redactSnapshotValue = (value: unknown, key = ""): unknown => {
  if (
    /(?:authorization|cookie|password|secret|token|auth)$/i.test(key) ||
    /^(?:headers|body)$/i.test(key)
  ) {
    return "[REDACTED]";
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSnapshotValue(item));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactSnapshotValue(entryValue, entryKey),
      ])
    );
  }
  if (typeof value === "string" && /^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.username !== "" || url.password !== "") {
        url.username = "";
        url.password = "";
        return url.toString();
      }
    } catch {
      // Keep non-URL project text unchanged.
    }
  }
  return value;
};

const getSnapshotItemCount = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.length;
  }
  return value === undefined ? 0 : 1;
};

const projectSnapshotResult = (result: unknown, input: unknown) => {
  if (typeof result !== "object" || result === null) {
    return result;
  }
  const snapshot = result as Record<string, unknown>;
  const options =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const requested = Array.isArray(options.include)
    ? options.include.filter((name): name is string => typeof name === "string")
    : Object.keys(snapshot).filter(
        (name) => snapshotMetadataKeys.has(name) === false
      );
  const namespaces = requested.map((name) => ({
    name,
    count: getSnapshotItemCount(snapshot[name]),
  }));
  const compact = {
    projectId: snapshot.projectId,
    buildId: snapshot.buildId,
    version: snapshot.version,
    detail: "compact" as const,
    namespaces,
  };
  if (options.verbose !== true) {
    return compact;
  }
  if (requested.length !== 1) {
    throw new Error(
      "Verbose snapshot requires exactly one namespace. Read additional namespaces with separate paginated calls."
    );
  }
  const namespace = requested[0];
  const value = snapshot[namespace];
  const allItems = Array.isArray(value)
    ? value
    : value === undefined
      ? []
      : [value];
  const cursor = options.cursor === undefined ? 0 : Number(options.cursor);
  if (Number.isInteger(cursor) === false || cursor < 0) {
    throw new Error("Invalid snapshot cursor");
  }
  const limit = options.limit === undefined ? 20 : Number(options.limit);
  if (Number.isInteger(limit) === false || limit < 1 || limit > 200) {
    throw new Error("Snapshot limit must be between 1 and 200");
  }
  const items = allItems
    .slice(cursor, cursor + limit)
    .map((item) => redactSnapshotValue(item));
  const nextOffset = cursor + items.length;
  return {
    ...compact,
    detail: "verbose" as const,
    namespace,
    items,
    total: allItems.length,
    returnedCount: items.length,
    nextCursor: nextOffset < allItems.length ? String(nextOffset) : null,
  };
};

export const isProjectSessionEnvelope = (
  value: unknown
): value is ProjectSessionEnvelope =>
  typeof value === "object" &&
  value !== null &&
  "operationId" in value &&
  "projectId" in value &&
  "state" in value &&
  "namespaces" in value &&
  "diagnostics" in value;

export const getProjectSessionMeta = serializeProjectSessionMeta;

export const executeProjectSessionApiOperation = async ({
  command,
  input,
  connection,
  createProjectSession = createCliProjectSession,
  getServerApiContract = getCliServerApiContract,
  dryRun = false,
  refresh = false,
}: {
  command: ProjectSessionApiCommand;
  input: unknown;
  connection: ProjectSessionApiConnection;
  createProjectSession?: CreateProjectSession;
  getServerApiContract?: typeof getCliServerApiContract;
  dryRun?: boolean;
  refresh?: boolean;
}) => {
  const operation = getPublicApiOperation(command);
  const runtimeOperationId = operation.runtimeOperationId as
    | RuntimeOperationId
    | undefined;
  if (
    dryRun === true &&
    (runtimeOperationId === undefined || operation.method !== "mutation")
  ) {
    throw new Error(
      `${command} does not support --dry-run. Use --dry-run only with local-capable mutation tools; omit it for read or server-only tools.`
    );
  }
  const session = createProjectSession({ connection });
  await session.initialize();
  if (refresh && runtimeOperationId !== undefined) {
    await session.refresh(
      uniqueNamespaces([
        ...operation.readNamespaces,
        ...operation.writeNamespaces,
      ])
    );
  }
  if (
    runtimeOperationId === undefined ||
    publicApiOperationRequiresServerSupport(operation)
  ) {
    const contract = await getServerApiContract(connection);
    assertCliServerOperationSupported(operation.id, contract);
  }
  const envelope =
    runtimeOperationId === undefined
      ? await session.executeServerOperation(
          {
            id: operation.id,
            invalidatesNamespaces: operation.invalidatesNamespaces,
            refetchInvalidatedNamespaces:
              operation.invalidatesNamespaces.length > 0,
          },
          input
        )
      : operation.method === "query"
        ? await session.read(
            runtimeOperationId,
            command === "audit"
              ? input
              : withProjectId(input, connection.projectId),
            { permit: operation.permit }
          )
        : await session.mutate(
            runtimeOperationId,
            withProjectId(input, connection.projectId),
            { permit: operation.permit, dryRun }
          );
  const projectedEnvelope =
    command === "snapshot"
      ? { ...envelope, result: projectSnapshotResult(envelope.result, input) }
      : envelope;
  const error = getSessionError(projectedEnvelope);
  if (error !== undefined) {
    throw createProjectSessionApiError(error);
  }
  return projectedEnvelope;
};
