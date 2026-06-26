import * as httpClient from "@webstudio-is/http-client";
import {
  builderNamespaces,
  type BuilderNamespace,
} from "@webstudio-is/project-build/contracts/namespaces";
import {
  executeProjectSessionApiOperation,
  getProjectSessionMeta,
  type ProjectSessionApiConnection,
} from "./project-session-api";
import { createCliProjectSession } from "./project-session";

type CreateProjectSession = typeof createCliProjectSession;

export type ProjectSessionMcpTool = {
  name: string;
  description: string;
  annotations: {
    command: string;
    operationId: string;
    method: httpClient.PublicApiOperationMethod | "session";
    permit: httpClient.PublicApiOperationPermit;
    localCapable: boolean;
    serverOnly: boolean;
    readNamespaces: readonly string[];
    writeNamespaces: readonly string[];
    invalidatesNamespaces: readonly string[];
    retryOnConflict: boolean;
  };
};

const sessionTools = [
  {
    name: "status",
    description: "Read the current local ProjectSession status and freshness.",
    annotations: {
      command: "status",
      operationId: "project-session.status",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  },
  {
    name: "refresh",
    description:
      "Refresh local ProjectSession namespaces from the configured project. Pass { namespaces } or omit it to refresh all namespaces.",
    annotations: {
      command: "refresh",
      operationId: "project-session.refresh",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: builderNamespaces,
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  },
  {
    name: "reset-session",
    description: "Delete the persisted local ProjectSession snapshot.",
    annotations: {
      command: "reset-session",
      operationId: "project-session.reset",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: builderNamespaces,
      retryOnConflict: false,
    },
  },
] as const satisfies readonly ProjectSessionMcpTool[];

export type ProjectSessionMcpCallResult = {
  content: [{ type: "text"; text: string }];
  structuredContent: {
    ok: true;
    data: unknown;
    meta: {
      session: ReturnType<typeof getProjectSessionMeta>;
    };
  };
};

export type ProjectSessionMcpResource = {
  uri: string;
  name: string;
  description: string;
  mimeType: "application/json";
};

export const listProjectSessionMcpTools = (): ProjectSessionMcpTool[] => [
  ...httpClient.publicApiOperations.map((operation) => ({
    name: operation.command,
    description: operation.description,
    annotations: {
      command: operation.command,
      operationId: operation.id,
      method: operation.method,
      permit: operation.permit,
      localCapable: operation.localCapable,
      serverOnly: operation.serverOnly,
      readNamespaces: operation.readNamespaces,
      writeNamespaces: operation.writeNamespaces,
      invalidatesNamespaces: operation.invalidatesNamespaces,
      retryOnConflict: operation.retryOnConflict,
    },
  })),
  ...sessionTools,
];

export const listProjectSessionMcpResources =
  (): ProjectSessionMcpResource[] => [
    {
      uri: "webstudio://project/status",
      name: "ProjectSession status",
      description:
        "Current local ProjectSession status and namespace metadata.",
      mimeType: "application/json",
    },
    {
      uri: "webstudio://project/tools",
      name: "Webstudio operation tools",
      description: "Catalog-derived MCP tools available for the project.",
      mimeType: "application/json",
    },
  ];

const toCallResult = (
  envelope: Parameters<typeof getProjectSessionMeta>[0]
): ProjectSessionMcpCallResult => {
  const structuredContent = {
    ok: true as const,
    data: envelope.result,
    meta: {
      session: getProjectSessionMeta(envelope),
    },
  };
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(structuredContent),
      },
    ],
    structuredContent,
  };
};

const toResourceContent = (
  envelope: Parameters<typeof getProjectSessionMeta>[0]
) => ({
  data: envelope.result,
  meta: {
    session: getProjectSessionMeta(envelope),
  },
});

const getRefreshNamespaces = (input: unknown): readonly BuilderNamespace[] => {
  const namespaces =
    typeof input === "object" && input !== null && "namespaces" in input
      ? (input as { namespaces?: unknown }).namespaces
      : undefined;
  if (namespaces === undefined) {
    return builderNamespaces;
  }
  if (Array.isArray(namespaces) === false) {
    throw new Error("refresh namespaces must be an array.");
  }
  const allowed = new Set<string>(builderNamespaces);
  for (const namespace of namespaces) {
    if (typeof namespace !== "string" || allowed.has(namespace) === false) {
      throw new Error(`Unknown ProjectSession namespace "${namespace}".`);
    }
  }
  return namespaces as BuilderNamespace[];
};

export const createProjectSessionMcpAdapter = ({
  connection,
  createProjectSession = createCliProjectSession,
}: {
  connection: ProjectSessionApiConnection;
  createProjectSession?: CreateProjectSession;
}) => {
  let session: ReturnType<CreateProjectSession> | undefined;
  const getSession: CreateProjectSession = (options) => {
    session ??= createProjectSession(options);
    return session;
  };
  return {
    listTools: listProjectSessionMcpTools,
    listResources: listProjectSessionMcpResources,
    async readResource({ uri }: { uri: string }) {
      if (uri === "webstudio://project/tools") {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify({ tools: listProjectSessionMcpTools() }),
            },
          ],
        };
      }
      if (uri === "webstudio://project/status") {
        const session = getSession({ connection });
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                toResourceContent(await session.initialize())
              ),
            },
          ],
        };
      }
      throw new Error(`Unknown MCP resource "${uri}".`);
    },
    async callTool({
      name,
      input = {},
      dryRun = false,
    }: {
      name: string;
      input?: unknown;
      dryRun?: boolean;
    }): Promise<ProjectSessionMcpCallResult> {
      const session = getSession({ connection });
      if (name === "status") {
        return toCallResult(await session.initialize());
      }
      if (name === "refresh") {
        await session.initialize();
        return toCallResult(await session.refresh(getRefreshNamespaces(input)));
      }
      if (name === "reset-session") {
        await session.initialize();
        return toCallResult(await session.reset());
      }
      const envelope = await executeProjectSessionApiOperation({
        command: name as httpClient.PublicApiCommand,
        input,
        connection,
        createProjectSession: getSession,
        dryRun,
      });
      return toCallResult(envelope);
    },
  };
};
