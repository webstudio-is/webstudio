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
  const error = getSessionError(envelope);
  if (error !== undefined) {
    throw createProjectSessionApiError(error);
  }
  return envelope;
};
