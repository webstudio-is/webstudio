import * as httpClient from "@webstudio-is/http-client";
import type { BuilderNamespace } from "@webstudio-is/project-build/contracts/namespaces";
import type { ProjectSessionEnvelope } from "@webstudio-is/project-build/project-session";
import { createCliProjectSession } from "./project-session";

export type ProjectSessionApiConnection = {
  projectId: string;
  origin: string;
  authToken: string;
  headers?: Record<string, string | undefined>;
};

export type ProjectSessionApiCommand = httpClient.PublicApiCommand;

type CreateProjectSession = typeof createCliProjectSession;

const uniqueNamespaces = (
  namespaces: readonly BuilderNamespace[]
): readonly BuilderNamespace[] => [...new Set(namespaces)];

const getRuntimeOperationId = (command: ProjectSessionApiCommand) => {
  const operation = httpClient.getPublicApiOperation(command);
  return operation.runtimeOperationId;
};

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

export const getProjectSessionMeta = (envelope: ProjectSessionEnvelope) => ({
  operationId: envelope.operationId,
  projectId: envelope.projectId,
  buildId: envelope.buildId,
  version: envelope.version,
  source: envelope.source,
  committed: envelope.state.committed,
  compatibility: envelope.state.compatibility,
  namespaces: envelope.namespaces,
  diagnostics: envelope.diagnostics,
});

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
  const runtimeOperationId = getRuntimeOperationId(command);
  const operation = httpClient.getPublicApiOperation(command);
  if (
    dryRun === true &&
    (runtimeOperationId === undefined || operation.method !== "mutation")
  ) {
    throw new Error(`${command} does not support --dry-run.`);
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
        ? await session.read(runtimeOperationId, input, {
            permit: operation.permit,
          })
        : await session.mutate(runtimeOperationId, input, {
            permit: operation.permit,
            dryRun,
          });
  const error = getSessionError(envelope);
  if (error !== undefined) {
    throw createProjectSessionApiError(error);
  }
  return envelope;
};
