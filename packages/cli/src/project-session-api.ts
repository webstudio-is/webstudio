import {
  getPublicApiOperation,
  type PublicApiCommand,
} from "@webstudio-is/protocol";
import type { RuntimeOperationId } from "@webstudio-is/project-build/contracts/builder-runtime";
import type { BuilderNamespace } from "@webstudio-is/project-build/contracts/namespaces";
import {
  serializeProjectSessionMeta,
  type ProjectSessionEnvelope,
} from "@webstudio-is/project-build/project-session";
import { createCliProjectSession } from "./project-session";

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
  diagnostics: readonly { level: string; code?: string; message: string }[];
}) => envelope.diagnostics.find((diagnostic) => diagnostic.level === "error");

const createProjectSessionApiError = (diagnostic: {
  code?: string;
  message: string;
}) => {
  const error = new Error(diagnostic.message) as Error & { code?: string };
  if (diagnostic.code !== undefined) {
    error.name = diagnostic.code;
    error.code = diagnostic.code;
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
  dryRun = false,
  refresh = false,
}: {
  command: ProjectSessionApiCommand;
  input: unknown;
  connection: ProjectSessionApiConnection;
  createProjectSession?: CreateProjectSession;
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
            withProjectId(input, connection.projectId),
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
