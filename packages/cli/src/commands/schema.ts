import {
  buildPatchNamespaces,
  publicApiOperations,
} from "@webstudio-is/protocol";
import {
  listProjectSessionMcpResources,
  listProjectSessionMcpTools,
} from "@webstudio-is/project-build/mcp";
import { HandledCliError } from "../errors";
import { printJson } from "../json-output";
import { useCaseScenarios } from "./api-command-docs";
import {
  apiCommandMetadata,
  cliCommandGroupMetadata,
  cliCommandMetadata,
  formatApiUseCaseCommand,
  topLevelCliCommandMetadata,
} from "./api-command-metadata";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

export const schemaOptions = (yargs: CommonYargsArgv) =>
  yargs
    .positional("topic", {
      type: "string",
      describe:
        "Schema topic to print: api for top-level CLI, mcp for MCP tools, or a specific MCP tool name",
      default: "api",
    })
    .option("json", {
      type: "boolean",
      describe:
        "Accepted for compatibility. Schema output is always machine-readable JSON",
      default: false,
    })
    .option("detail", {
      type: "string",
      choices: ["overview", "summary", "full"] as const,
      describe:
        "Schema detail. For mcp, overview is tiny, summary lists tools, full includes every input schema.",
    })
    .option("tool", {
      type: "string",
      describe:
        "Focus MCP schema on one or more comma-separated tool names, for example insert-fragment",
    });

type SchemaDetail = "overview" | "summary" | "full";

type SchemaOptions = Omit<
  StrictYargsOptionsToInterface<typeof schemaOptions>,
  "topic" | "detail" | "tool"
> & {
  topic?: string;
  detail?: string;
  tool?: string;
};

const topLevelCommands = topLevelCliCommandMetadata.map(
  ({ command, description, examples }) => ({
    name: command,
    summary: description,
    examples,
  })
);

const cliCommands = cliCommandMetadata.map((command) => ({
  name: command.cliCommand,
  operation: command.operation,
  summary: command.description,
  method: command.method,
  permit: command.permit,
  requiredOptions: command.requiredOptions ?? ["json"],
  inputSchema: command.inputSchema,
  examples: (command.examples ?? []).map(formatApiUseCaseCommand),
}));

const commandGroups = cliCommandGroupMetadata.map(
  ({ command, description }) => ({
    name: command,
    summary: description,
    commands: cliCommands.filter(({ name }) => name.startsWith(`${command} `)),
  })
);

const topLevelUseCases = useCaseScenarios.filter((scenario) =>
  scenario.commands.every((command) => command.startsWith("webstudio "))
);

const availableSchemaTopics = ["api", "mcp"] as const;

const mcpToolSchema = listProjectSessionMcpTools(publicApiOperations, {
  includeImport: true,
  includeScreenshot: true,
  includeScreenshotDiff: true,
  includeInstallOcr: true,
  includePreview: true,
}).map((tool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
  examples: tool.mcpExamples ?? [],
  annotations: tool.annotations,
}));

const mcpToolSummary = mcpToolSchema.map(
  ({ name, description, examples, annotations }) => ({
    name,
    description,
    requiredInputFields: annotations.requiredInputFields,
    inputFields: annotations.inputFields,
    examples,
    operationId: annotations.operationId,
    method: annotations.method,
    localCapable: annotations.localCapable,
    serverOnly: annotations.serverOnly,
  })
);

const getSchemaDetail = (
  detail: string | undefined,
  hasToolFilter = false
): SchemaDetail => {
  if (
    detail === undefined ||
    detail === "overview" ||
    detail === "summary" ||
    detail === "full"
  ) {
    return detail ?? (hasToolFilter ? "full" : "overview");
  }
  throw new Error(
    `Unknown schema detail "${detail}". Available details: overview, summary, full`
  );
};

const getSelectedMcpToolSchemas = (toolFilter: string | undefined) => {
  if (toolFilter === undefined || toolFilter.trim() === "") {
    return;
  }
  const toolNames = toolFilter
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const toolSchemaByName = new Map(
    mcpToolSchema.map((tool) => [tool.name, tool])
  );
  const selectedTools = toolNames.map((toolName) => {
    const tool = toolSchemaByName.get(toolName);
    if (tool === undefined) {
      throw new Error(
        `Unknown MCP tool "${toolName}". Use webstudio schema mcp for tool names, or webstudio meta.get_more_tools '{"tools":["insert-fragment"]}' for focused discovery.`
      );
    }
    return tool;
  });
  return selectedTools;
};

const getMcpSchemaTools = (
  detail: SchemaDetail,
  tools: typeof mcpToolSchema
) => {
  if (detail === "full") {
    return tools;
  }
  if (detail === "summary") {
    const selectedToolNames = new Set(tools.map((tool) => tool.name));
    return mcpToolSummary.filter((tool) => selectedToolNames.has(tool.name));
  }
  return tools.map(({ name }) => name);
};

const createMcpSchema = (
  detail: SchemaDetail,
  selectedTools: typeof mcpToolSchema = mcpToolSchema
) => ({
  name: "webstudio-mcp",
  version: 1,
  command: "webstudio mcp",
  singleOpCallCommand: "webstudio mcp single-op-call <tool> '<json>'",
  focusedToolNames:
    selectedTools.length === mcpToolSchema.length
      ? undefined
      : selectedTools.map(({ name }) => name),
  detail,
  usage:
    selectedTools.length !== mcpToolSchema.length
      ? "Focused MCP tool schema. Use this when you know the tool name and need exact input fields."
      : detail === "full"
        ? "Full MCP tool schema. This output is large; prefer summary detail plus focused meta.get_more_tools/components.* calls for normal LLM workflows."
        : detail === "summary"
          ? 'MCP tool summary. Use this to inspect all tool descriptions and fields without full schemas. For exact tool schemas use webstudio schema mcp --detail full, or prefer focused webstudio mcp single-op-call meta.get_more_tools \'{"tools":["insert-fragment"]}\'.'
          : "Tiny MCP overview. Use this first to discover tool names. For all descriptions use --detail summary; for exact schemas use --detail full or --tool <name>; for normal LLM workflows prefer focused meta.get_more_tools and components.* calls.",
  discovery: [
    "webstudio mcp single-op-call meta.index",
    `webstudio mcp single-op-call meta.guide '{"brief":"Create a design system page using every component"}'`,
    `webstudio mcp single-op-call meta.get_more_tools '{"tools":["insert-fragment"]}'`,
    `webstudio mcp single-op-call components.list '{"source":"all"}'`,
    "webstudio mcp single-op-call components.coverage-plan",
    `webstudio mcp single-op-call components.search '{"brief":"radix select"}'`,
    `webstudio mcp single-op-call components.get '{"component":"@webstudio-is/sdk-components-react-radix:Select"}'`,
    "webstudio mcp single-op-call templates.list",
    `webstudio mcp single-op-call templates.get '{"component":"@webstudio-is/sdk-components-react-radix:Select"}'`,
  ],
  resources: listProjectSessionMcpResources(),
  toolCount: selectedTools.length,
  tools: getMcpSchemaTools(detail, selectedTools),
});

const apiSchema = {
  name: "webstudio-cli",
  version: 1,
  projectScope:
    "All high-level API commands operate on the single project configured by webstudio link or webstudio init --link.",
  requiredOutputMode:
    "Schema output is always JSON. Successful API command responses are { ok: true, data, meta }. Failures are { ok: false, error, meta }.",
  topLevelCommands,
  commandGroups,
  commands: cliCommands,
  mcp: {
    command: "webstudio mcp",
    toolCount: apiCommandMetadata.length,
    tools:
      "MCP exposes the full project operation catalog, including fine-grained page, instance, props, styles, tokens, variables, resources, and assets tools.",
    discovery: [
      "tools/list",
      "resources/list",
      "meta.index",
      "meta.guide",
      "meta.get_more_tools",
    ],
    resources: [
      "webstudio://project/status",
      "webstudio://project/tools",
      "webstudio://project/components",
      "webstudio://project/guide",
    ],
    capabilities: [
      "Project discovery and session status",
      "Pages, folders, redirects, and project settings",
      "Instances/components, text, props, and bindings",
      "Styles, design tokens, CSS variables, and breakpoints",
      "Data variables, resources, assets, publishing, domains, screenshots, and visual diffing",
    ],
    boundary:
      "Builder project data manipulation is MCP-level. Use tools/list, meta.index, meta.get_more_tools, and webstudio://project/tools for exact MCP tool schemas.",
  },
  session: {
    stateFile: ".webstudio/project-session.json",
    refreshFlag:
      "Use --refresh to refresh required namespaces before local-capable commands.",
    localReads:
      "Local-capable read commands use compatible cached namespaces and fetch only missing or stale namespaces.",
    localMutations:
      "Local-capable mutation commands build patches locally, commit with the cached build version, and update local state only after the remote commit succeeds.",
    serverOnly:
      "Server-only commands run remotely and invalidate/refetch namespaces declared by the public operation catalog.",
    resultMetadata:
      "Successful command JSON includes compact meta.session with operationId, buildId, version, source, committed, namespaceCounts, diagnosticCount, non-empty diagnostic summaries, and optional compatibilityVersion.",
  },
  useCases: topLevelUseCases,
  patch: {
    validationCommand:
      "No top-level CLI validation command. Prefer semantic MCP tools; use MCP apply-patch only for known-valid BuildPatchTransaction[] payloads.",
    writeCommand: "MCP tool: apply-patch",
    transactionInput:
      "Either BuildPatchTransaction[] or { transactions: BuildPatchTransaction[] }",
    namespaces: buildPatchNamespaces,
    operations: ["add", "remove", "replace"],
    rules: [
      "Use MCP tool: snapshot before writing and use the returned latest build version as baseVersion.",
      "Use semantic MCP read tools first, then snapshot for exact patch paths.",
      "Regenerate patches after a VERSION_CONFLICT failure.",
    ],
  },
};

export const schema = (options: SchemaOptions) => {
  try {
    const topic = options.topic ?? "api";
    if (topic === "api") {
      printJson(apiSchema);
      return;
    }
    if (topic === "mcp") {
      const selectedTools = getSelectedMcpToolSchemas(options.tool);
      printJson(
        createMcpSchema(
          getSchemaDetail(options.detail, selectedTools !== undefined),
          selectedTools
        )
      );
      return;
    }
    const focusedTool = getSelectedMcpToolSchemas(topic);
    if (focusedTool !== undefined) {
      printJson(createMcpSchema("full", focusedTool));
      return;
    }
    if (availableSchemaTopics.includes(topic as never) === false) {
      throw new Error(
        `Unknown schema topic "${topic}". Available topics: ${availableSchemaTopics.join(", ")}, or pass a specific MCP tool name such as insert-fragment.`
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    throw new HandledCliError();
  }
};
