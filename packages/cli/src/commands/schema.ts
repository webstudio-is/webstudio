import {
  buildPatchNamespaces,
  publicApiOperations,
} from "@webstudio-is/protocol";
import {
  listProjectSessionMcpResources,
  listProjectSessionMcpTools,
  paginateOutput,
  projectOutput,
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
    .option("verbose", {
      type: "boolean",
      describe: "Include complete command and tool schemas",
    })
    .option("cursor", {
      type: "string",
      describe: "Pagination cursor returned by the previous schema call",
    })
    .option("limit", {
      type: "number",
      describe: "Maximum schemas to return, from 1 to 200",
    })
    .option("tool", {
      type: "string",
      describe:
        "Focus MCP schema on one or more comma-separated tool names, for example insert-fragment",
    });

type SchemaOptions = Omit<
  StrictYargsOptionsToInterface<typeof schemaOptions>,
  "topic" | "tool" | "verbose" | "cursor" | "limit"
> & {
  topic?: string;
  tool?: string;
  verbose?: boolean;
  cursor?: string;
  limit?: number;
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
  ...(command.outputSchema === undefined
    ? {}
    : { outputSchema: command.outputSchema }),
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
  ...(tool.outputSchema === undefined
    ? {}
    : { outputSchema: tool.outputSchema }),
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
const mcpToolSummaryByName = new Map(
  mcpToolSummary.map((summary) => [summary.name, summary])
);

const paginateSchemas = <Item extends object, Compact extends object>(
  items: readonly Item[],
  options: Pick<SchemaOptions, "cursor" | "limit" | "verbose">,
  compact: (item: Item) => Compact
) =>
  paginateOutput({
    items: items.map((item) =>
      projectOutput({
        input: options,
        compact: compact(item),
        expanded: () => item,
      })
    ),
    cursor: options.cursor,
    limit: options.limit,
    filters: {},
    verbose: options.verbose,
    invalidCursorMessage: "Invalid schema cursor",
  });

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

const createMcpSchema = (
  options: Pick<SchemaOptions, "cursor" | "limit" | "verbose">,
  selectedTools: typeof mcpToolSchema = mcpToolSchema
) => {
  const focused = selectedTools.length !== mcpToolSchema.length;
  const detailOptions = {
    ...options,
    verbose: options.verbose ?? focused,
  };
  const { items, ...pagination } = paginateSchemas(
    selectedTools,
    detailOptions,
    (tool) => {
      const summary = mcpToolSummaryByName.get(tool.name);
      if (summary === undefined) {
        throw new Error(`Missing compact schema for MCP tool "${tool.name}".`);
      }
      return summary;
    }
  );
  return {
    name: "webstudio-mcp",
    version: 1,
    command: "webstudio mcp",
    singleOpCallCommand: "webstudio mcp single-op-call <tool> '<json>'",
    focusedToolNames: focused
      ? selectedTools.map(({ name }) => name)
      : undefined,
    usage: focused
      ? "Focused MCP tool schema. Use this when you know the tool name and need exact input fields."
      : detailOptions.verbose
        ? "Full MCP tool schema. This output is large; prefer compact output plus focused meta.get_more_tools/components.* calls for normal LLM workflows."
        : "Compact MCP tool summary. Use --verbose only when complete input and output schemas are needed.",
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
    tools: items,
    ...pagination,
  };
};

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
    if (
      options.limit !== undefined &&
      (Number.isInteger(options.limit) === false ||
        options.limit < 1 ||
        options.limit > 200)
    ) {
      throw new Error("--limit must be an integer from 1 to 200.");
    }
    const topic = options.topic ?? "api";
    if (topic === "api") {
      const { items, ...pagination } = paginateSchemas(
        cliCommands,
        options,
        ({ name, operation, summary, requiredOptions }) => ({
          name,
          operation,
          summary,
          requiredOptions,
        })
      );
      const pageCommandNames = new Set(items.map(({ name }) => name));
      printJson(
        projectOutput({
          input: options,
          compact: {
            name: apiSchema.name,
            version: apiSchema.version,
            topLevelCommands,
            commands: items,
            ...pagination,
          },
          expanded: () => ({
            ...apiSchema,
            commands: items,
            commandGroups: commandGroups.map((group) => ({
              ...group,
              commands: group.commands.filter(({ name }) =>
                pageCommandNames.has(name)
              ),
            })),
            ...pagination,
          }),
        })
      );
      return;
    }
    if (topic === "mcp") {
      const selectedTools = getSelectedMcpToolSchemas(options.tool);
      printJson(createMcpSchema(options, selectedTools));
      return;
    }
    const focusedTool = getSelectedMcpToolSchemas(topic);
    if (focusedTool !== undefined) {
      printJson(createMcpSchema(options, focusedTool));
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
