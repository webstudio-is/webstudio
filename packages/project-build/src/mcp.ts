import {
  builderNamespaces,
  type BuilderNamespace,
} from "./contracts/namespaces";
import type { ProjectSessionEnvelope } from "./project-session";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

type PublicMcpOperationMethod = "query" | "mutation";
type PublicMcpOperationPermit = "api" | "view" | "build" | "edit" | "admin";

export type PublicMcpOperation<Command extends string = string> = {
  command: Command;
  id: string;
  method: PublicMcpOperationMethod;
  permit: PublicMcpOperationPermit;
  description: string;
  inputFields: readonly string[];
  requiredOptions?: readonly string[];
  examples?: readonly string[];
  localCapable: boolean;
  serverOnly: boolean;
  readNamespaces: readonly string[];
  writeNamespaces: readonly string[];
  invalidatesNamespaces: readonly string[];
  retryOnConflict: boolean;
};

type ProjectSessionLike = {
  initialize: () => Promise<ProjectSessionEnvelope>;
  refresh: (
    namespaces: readonly BuilderNamespace[]
  ) => Promise<ProjectSessionEnvelope>;
  reset: () => Promise<ProjectSessionEnvelope>;
};

type CreateProjectSession = () => ProjectSessionLike;

type ExecuteMcpOperation<Command extends string = string> = (options: {
  command: Command;
  input: unknown;
  dryRun: boolean;
}) => Promise<ProjectSessionEnvelope>;

export type McpErrorCodeResolver = (error: unknown) => string | undefined;

export type McpTransport = Transport;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getRequestParams = (request: unknown) =>
  isRecord(request) && isRecord(request.params) ? request.params : {};

const getProjectSessionMeta = (envelope: ProjectSessionEnvelope) => ({
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

type ProjectSessionMcpInputSchema = {
  type: "object";
  description?: string;
  additionalProperties: true;
  properties?: Record<string, unknown>;
  required?: readonly string[];
};

const emptyInputSchema = {
  type: "object",
  description:
    "Pass the public API input object for this tool. Use meta.get_more_tools for examples and required fields.",
  additionalProperties: true,
} as const satisfies ProjectSessionMcpInputSchema;

const textInputSchema = (description: string) =>
  ({
    ...emptyInputSchema,
    properties: {
      brief: {
        type: "string",
        description,
      },
    },
  }) as const satisfies ProjectSessionMcpInputSchema;

const getOperationInputSchema = (
  operation: Pick<PublicMcpOperation, "inputFields">
): ProjectSessionMcpInputSchema => {
  if (operation.inputFields.length === 0) {
    return emptyInputSchema;
  }
  return {
    ...emptyInputSchema,
    properties: Object.fromEntries(
      operation.inputFields.map((field) => [
        field,
        {
          description: `Public API input field \`${field}\`.`,
        },
      ])
    ),
  };
};

export type ProjectSessionMcpTool = {
  name: string;
  description: string;
  inputSchema: ProjectSessionMcpInputSchema;
  cliRequiredOptions?: readonly string[];
  cliExamples?: readonly string[];
  mcpExamples?: readonly unknown[];
  annotations: {
    command: string;
    operationId: string;
    method: PublicMcpOperation["method"] | "session";
    permit: PublicMcpOperation["permit"];
    inputFields: readonly string[];
    localCapable: boolean;
    serverOnly: boolean;
    readNamespaces: readonly string[];
    writeNamespaces: readonly string[];
    invalidatesNamespaces: readonly string[];
    retryOnConflict: boolean;
  };
};

export const mcpArgumentExamples: Record<string, readonly unknown[]> = {
  "meta.guide": [{ brief: "Create a pricing page and style the hero" }],
  "meta.get_more_tools": [{ brief: "update-styles" }],
  refresh: [{ namespaces: ["pages", "instances", "styles"] }],
  "list-pages": [{ includeFolders: true }],
  "get-page-by-path": [{ path: "/pricing" }],
  "list-instances": [{ pagePath: "/", maxDepth: 3 }],
  "inspect-instance": [
    {
      instanceId: "instance-id",
      include: ["props", "styles", "children"],
    },
  ],
  "append-instance": [
    {
      parentInstanceId: "parent-id",
      children: [{ tag: "section", label: "Hero", text: "Launch faster" }],
    },
  ],
  "update-text": [
    {
      instanceId: "instance-id",
      childIndex: 0,
      text: "Launch faster",
    },
  ],
  "update-styles": [
    {
      updates: [
        {
          instanceId: "instance-id",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    },
  ],
  "apply-patch": [
    {
      baseVersion: 12,
      transactions: [
        {
          id: "transaction-id",
          payload: [
            {
              namespace: "pages",
              patches: [
                {
                  op: "replace",
                  path: ["meta", "siteName"],
                  value: "Site name",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  publish: [{ target: "production" }],
  "create-domain": [{ domain: "www.example.com" }],
} as const;

const getMcpExamples = (command: string): readonly unknown[] =>
  mcpArgumentExamples[command] ?? [];

const sessionTools = [
  {
    name: "meta.index",
    description:
      "Return a concise Webstudio MCP capability catalog and discovery guide.",
    inputSchema: emptyInputSchema,
    annotations: {
      command: "meta.index",
      operationId: "meta.index",
      method: "session",
      permit: "api",
      inputFields: [],
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  },
  {
    name: "meta.guide",
    description:
      "Return a recommended workflow and relevant tools for a user goal. Pass { brief }.",
    inputSchema: textInputSchema(
      "Short user goal, for example: publish a site."
    ),
    annotations: {
      command: "meta.guide",
      operationId: "meta.guide",
      method: "session",
      permit: "api",
      inputFields: ["brief"],
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  },
  {
    name: "meta.get_more_tools",
    description:
      "Return detailed tool metadata and examples matching a brief. Pass { brief }.",
    inputSchema: textInputSchema(
      "Tool name, operation id, area, or goal, for example: build.publish."
    ),
    annotations: {
      command: "meta.get_more_tools",
      operationId: "meta.get_more_tools",
      method: "session",
      permit: "api",
      inputFields: ["brief"],
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  },
  {
    name: "status",
    description: "Read the current local ProjectSession status and freshness.",
    inputSchema: emptyInputSchema,
    annotations: {
      command: "status",
      operationId: "project-session.status",
      method: "session",
      permit: "api",
      inputFields: [],
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
    inputSchema: {
      ...emptyInputSchema,
      properties: {
        namespaces: {
          type: "array",
          items: { type: "string", enum: builderNamespaces },
          description:
            "Synced namespaces to refresh. Omit to refresh every namespace.",
        },
      },
    },
    annotations: {
      command: "refresh",
      operationId: "project-session.refresh",
      method: "session",
      permit: "api",
      inputFields: ["namespaces"],
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
    inputSchema: emptyInputSchema,
    annotations: {
      command: "reset-session",
      operationId: "project-session.reset",
      method: "session",
      permit: "api",
      inputFields: [],
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: builderNamespaces,
      retryOnConflict: false,
    },
  },
] as const satisfies readonly ProjectSessionMcpTool[];

type ProjectSessionMcpStructuredContent = {
  ok: true;
  data: unknown;
  meta: {
    session?: ReturnType<typeof getProjectSessionMeta>;
  };
};

export type ProjectSessionMcpCallResult = {
  content: [{ type: "text"; text: string }];
  structuredContent: ProjectSessionMcpStructuredContent;
  isError?: boolean;
};

export type ProjectSessionMcpResource = {
  uri: string;
  name: string;
  description: string;
  mimeType: "application/json";
};

type SdkTool = {
  name: string;
  description: string;
  inputSchema: ProjectSessionMcpInputSchema;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    openWorldHint: boolean;
  };
  _meta: {
    webstudio: ProjectSessionMcpTool["annotations"];
  };
};

export const listProjectSessionMcpTools = (
  operations: readonly PublicMcpOperation[]
): ProjectSessionMcpTool[] => [
  ...operations.map((operation) => ({
    name: operation.command,
    description: operation.description,
    inputSchema: getOperationInputSchema(operation),
    cliRequiredOptions: operation.requiredOptions,
    cliExamples: operation.examples,
    mcpExamples: getMcpExamples(operation.command),
    annotations: {
      command: operation.command,
      operationId: operation.id,
      method: operation.method,
      permit: operation.permit,
      inputFields: operation.inputFields,
      localCapable: operation.localCapable,
      serverOnly: operation.serverOnly,
      readNamespaces: operation.readNamespaces,
      writeNamespaces: operation.writeNamespaces,
      invalidatesNamespaces: operation.invalidatesNamespaces,
      retryOnConflict: operation.retryOnConflict,
    },
  })),
  ...sessionTools.map((tool) => ({
    ...tool,
    mcpExamples: getMcpExamples(tool.name),
  })),
];

const toMetaResult = (data: unknown): ProjectSessionMcpCallResult => {
  const structuredContent = {
    ok: true as const,
    data,
    meta: {},
  } satisfies ProjectSessionMcpStructuredContent;
  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
};

const capabilityAreas = [
  {
    area: "discover",
    goal: "Understand connection, permissions, project status, and available tools.",
    tools: [
      "meta.index",
      "meta.guide",
      "meta.get_more_tools",
      "status",
      "permissions",
      "whoami",
      "inspect",
    ],
  },
  {
    area: "pages",
    goal: "Create, inspect, update, duplicate, delete, and organize pages and folders.",
    tools: [
      "list-pages",
      "get-page",
      "get-page-by-path",
      "create-page",
      "update-page",
      "duplicate-page",
      "delete-page",
      "list-folders",
    ],
  },
  {
    area: "content",
    goal: "Inspect and edit element instances, text, props, bindings, and page content.",
    tools: [
      "list-instances",
      "inspect-instance",
      "append-instance",
      "move-instance",
      "clone-instance",
      "delete-instance",
      "list-texts",
      "update-text",
      "update-props",
      "delete-props",
      "bind-props",
    ],
  },
  {
    area: "styles",
    goal: "Read and change styles, design tokens, CSS variables, and breakpoints.",
    tools: [
      "get-styles",
      "update-styles",
      "delete-styles",
      "replace-styles",
      "list-design-tokens",
      "create-design-token",
      "list-css-variables",
      "define-css-variable",
      "list-breakpoints",
    ],
  },
  {
    area: "data",
    goal: "Manage data variables and resources.",
    tools: [
      "list-variables",
      "create-variable",
      "update-variable",
      "delete-variable",
      "list-resources",
      "create-resource",
      "update-resource",
      "delete-resource",
    ],
  },
  {
    area: "assets",
    goal: "Upload, replace, delete, list, and find usage of assets.",
    tools: [
      "list-assets",
      "upload-asset",
      "upload-assets",
      "find-asset-usage",
      "replace-asset",
      "delete-asset",
    ],
  },
  {
    area: "publish",
    goal: "Publish, unpublish, inspect publish jobs, and manage domains.",
    tools: [
      "publish",
      "list-publishes",
      "get-publish-job",
      "unpublish",
      "list-domains",
      "create-domain",
      "update-domain",
      "delete-domain",
      "verify-domain",
    ],
  },
  {
    area: "raw-patch",
    goal: "Use raw Builder patches only when no semantic tool fits.",
    tools: ["snapshot", "apply-patch"],
  },
] as const;

const getBrief = (input: unknown) =>
  typeof input === "object" &&
  input !== null &&
  "brief" in input &&
  typeof (input as { brief?: unknown }).brief === "string"
    ? (input as { brief: string }).brief
    : "";

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ");

const scoreTool = (tool: ProjectSessionMcpTool, brief: string) => {
  const normalizedBrief = normalize(brief);
  if (normalizedBrief.trim().length === 0) {
    return 0;
  }
  const haystack = normalize(
    [
      tool.name,
      tool.description,
      tool.annotations.operationId,
      tool.annotations.readNamespaces.join(" "),
      tool.annotations.writeNamespaces.join(" "),
    ].join(" ")
  );
  let score = 0;
  for (const token of normalizedBrief.split(/\s+/)) {
    if (token.length < 3) {
      continue;
    }
    if (haystack.includes(token)) {
      score += token.length;
    }
  }
  return score;
};

const getMatchingTools = (
  brief: string,
  tools: readonly ProjectSessionMcpTool[]
) => {
  const normalizedBrief = normalize(brief);
  if (normalizedBrief.trim().length === 0) {
    const names = new Set<string>(capabilityAreas[0].tools);
    return tools.filter((tool) => names.has(tool.name));
  }
  const area = capabilityAreas.find((area) =>
    [area.area, area.goal, area.tools.join(" ")]
      .map(normalize)
      .some((value) => value.includes(normalizedBrief))
  );
  if (area !== undefined) {
    const names = new Set<string>(area.tools);
    return tools.filter((tool) => names.has(tool.name));
  }
  return tools
    .map((tool) => ({ tool, score: scoreTool(tool, brief) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ tool }) => tool);
};

const filterCapabilities = (tools: readonly ProjectSessionMcpTool[]) => {
  const names = new Set(tools.map((tool) => tool.name));
  return capabilityAreas
    .map((capability) => ({
      ...capability,
      tools: capability.tools.filter((tool) => names.has(tool)),
    }))
    .filter((capability) => capability.tools.length > 0);
};

const getMetaIndex = (tools: readonly ProjectSessionMcpTool[]) => {
  const names = new Set(tools.map((tool) => tool.name));
  return {
    startHere: ["meta.index", "meta.guide", "status", "permissions"].filter(
      (tool) => names.has(tool)
    ),
    discovery: {
      tools: "Use MCP tools/list for machine-readable tool schemas.",
      resources: "Use MCP resources/list for longer JSON resources.",
      guide: "Use meta.guide({ brief }) for a goal-specific workflow.",
      details:
        "Use meta.get_more_tools({ brief }) for matching params and examples.",
    },
    rules: [
      "Operate on the configured project only.",
      "Read ids before writing.",
      "Prefer semantic tools over apply-patch.",
      "Use status/refresh when cached data may be stale.",
    ],
    capabilities: filterCapabilities(tools),
  };
};

const getMetaGuide = (
  brief: string,
  tools: readonly ProjectSessionMcpTool[]
) => {
  const matches = getMatchingTools(brief, tools).slice(0, 12);
  return {
    brief,
    workflow: [
      "Call permissions to verify token capabilities.",
      "Call status to inspect local ProjectSession state.",
      matches.some((tool) => tool.annotations.localCapable)
        ? "Call refresh if cached namespaces may be stale."
        : undefined,
      "Use focused read tools to collect ids and current values.",
      "Use the smallest semantic mutation tool that matches the requested change.",
      "Use apply-patch only when no semantic mutation tool fits.",
    ].filter(Boolean),
    tools: matches.map((tool) => ({
      name: tool.name,
      use: tool.description,
      method: tool.annotations.method,
      permit: tool.annotations.permit,
      inputFields: tool.annotations.inputFields,
      mcpExamples: tool.mcpExamples ?? [],
      cliRequiredOptions: tool.cliRequiredOptions ?? [],
      cliExamples: tool.cliExamples ?? [],
    })),
    more: "Call meta.get_more_tools with the same brief for params, examples, namespaces, and server/local behavior.",
  };
};

const getMoreTools = (
  brief: string,
  tools: readonly ProjectSessionMcpTool[]
) => ({
  brief,
  tools: getMatchingTools(brief, tools).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    inputFields: tool.annotations.inputFields,
    mcpExamples: tool.mcpExamples ?? [],
    cliRequiredOptions: tool.cliRequiredOptions ?? [],
    cliExamples: tool.cliExamples ?? [],
    inputNote:
      "MCP tool arguments are public API input objects. CLI examples show intent, but do not imply MCP flag names.",
    annotations: tool.annotations,
  })),
});

const toSdkTool = (tool: ProjectSessionMcpTool): SdkTool => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
  annotations: {
    readOnlyHint:
      tool.annotations.method === "query" ||
      tool.annotations.method === "session",
    destructiveHint: tool.annotations.method === "mutation",
    openWorldHint: tool.annotations.serverOnly,
  },
  _meta: {
    webstudio: tool.annotations,
  },
});

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
    {
      uri: "webstudio://project/guide",
      name: "Webstudio MCP guide",
      description:
        "Concise model-facing guide for discovering and choosing Webstudio MCP tools.",
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

const builderNamespaceSet = new Set<string>(builderNamespaces);

const isBuilderNamespace = (value: unknown): value is BuilderNamespace =>
  typeof value === "string" && builderNamespaceSet.has(value);

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
  const result: BuilderNamespace[] = [];
  for (const namespace of namespaces) {
    if (isBuilderNamespace(namespace) === false) {
      throw new Error(`Unknown ProjectSession namespace "${namespace}".`);
    }
    result.push(namespace);
  }
  return result;
};

export const createProjectSessionMcpCore = <Command extends string = string>({
  operations,
  createProjectSession,
  executeOperation,
}: {
  operations: readonly (PublicMcpOperation & { command: Command })[];
  createProjectSession: CreateProjectSession;
  executeOperation: ExecuteMcpOperation<Command>;
}) => {
  let session: ReturnType<CreateProjectSession> | undefined;
  const operationCommands = new Set(
    operations.map((operation) => operation.command)
  );
  const listTools = () => listProjectSessionMcpTools(operations);
  const getSession = () => {
    session ??= createProjectSession();
    return session;
  };
  return {
    listTools,
    listResources: listProjectSessionMcpResources,
    async readResource({ uri }: { uri: string }) {
      if (uri === "webstudio://project/tools") {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify({ tools: listTools() }),
            },
          ],
        };
      }
      if (uri === "webstudio://project/guide") {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(getMetaIndex(listTools())),
            },
          ],
        };
      }
      if (uri === "webstudio://project/status") {
        const session = getSession();
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
      if (name === "meta.index") {
        return toMetaResult(getMetaIndex(listTools()));
      }
      if (name === "meta.guide") {
        return toMetaResult(getMetaGuide(getBrief(input), listTools()));
      }
      if (name === "meta.get_more_tools") {
        return toMetaResult(getMoreTools(getBrief(input), listTools()));
      }
      if (name === "status") {
        const session = getSession();
        return toCallResult(await session.initialize());
      }
      if (name === "refresh") {
        const session = getSession();
        await session.initialize();
        return toCallResult(await session.refresh(getRefreshNamespaces(input)));
      }
      if (name === "reset-session") {
        const session = getSession();
        return toCallResult(await session.reset());
      }
      if (operationCommands.has(name as Command) === false) {
        throw new Error(`Unknown MCP tool "${name}".`);
      }
      const envelope = await executeOperation({
        command: name as Command,
        input,
        dryRun,
      });
      return toCallResult(envelope);
    },
  };
};

const getToolCallInput = (input: unknown) => {
  if (isRecord(input) === false) {
    return { input, dryRun: false };
  }
  const dryRun = input.dryRun === true || input["dry-run"] === true;
  const { dryRun: _dryRun, "dry-run": _dashDryRun, ...rest } = input;
  return { input: rest, dryRun };
};

type ProjectSessionMcpErrorResult = {
  isError: true;
  content: [{ type: "text"; text: string }];
  structuredContent: {
    ok: false;
    error: {
      message: string;
      code: string;
    };
    meta: Record<string, never>;
  };
};

const toToolErrorResult = (
  error: unknown,
  getErrorCode: McpErrorCodeResolver | undefined
): ProjectSessionMcpErrorResult => {
  const message = error instanceof Error ? error.message : String(error);
  const structuredContent = {
    ok: false as const,
    error: {
      message,
      code: getErrorCode?.(error) ?? "MCP_TOOL_FAILED",
    },
    meta: {},
  };
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
};

export const createProjectSessionMcpServer = async <
  Command extends string = string,
>({
  operations,
  createProjectSession,
  executeOperation,
  getErrorCode,
}: {
  operations: readonly (PublicMcpOperation & { command: Command })[];
  createProjectSession: CreateProjectSession;
  executeOperation: ExecuteMcpOperation<Command>;
  getErrorCode?: McpErrorCodeResolver;
}) => {
  const core = createProjectSessionMcpCore({
    operations,
    createProjectSession,
    executeOperation,
  });
  const server = new Server(
    { name: "webstudio", version: "0.0.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions:
        "Use meta.index, meta.guide, and meta.get_more_tools to discover Webstudio project capabilities. Read ids before writing and prefer semantic tools over apply-patch.",
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: core.listTools().map(toSdkTool),
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: core.listResources(),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const params = getRequestParams(request);
    const uri = typeof params.uri === "string" ? params.uri : "";
    try {
      return await core.readResource({
        uri,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              ok: false,
              error: {
                message,
                code: getErrorCode?.(error) ?? "MCP_RESOURCE_FAILED",
              },
              meta: {},
            }),
          },
        ],
      };
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const params = getRequestParams(request);
    const name = typeof params.name === "string" ? params.name : "";
    const { input, dryRun } = getToolCallInput(params.arguments ?? {});
    try {
      return await core.callTool({
        name,
        input,
        dryRun,
      });
    } catch (error) {
      return toToolErrorResult(error, getErrorCode);
    }
  });

  return server;
};

export const connectProjectSessionMcpServer = async <Command extends string>({
  transport,
  ...options
}: Parameters<typeof createProjectSessionMcpServer<Command>>[0] & {
  transport: McpTransport;
}) => {
  const server = await createProjectSessionMcpServer(options);
  await server.connect(transport);
  return server;
};

export const createMcpStdioTransport = async ({
  stdin,
  stdout,
}: {
  stdin: ConstructorParameters<typeof StdioServerTransport>[0];
  stdout: ConstructorParameters<typeof StdioServerTransport>[1];
}): Promise<McpTransport> => {
  return new StdioServerTransport(stdin, stdout);
};
