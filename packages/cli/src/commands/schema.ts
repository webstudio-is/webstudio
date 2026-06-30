import { buildPatchNamespaces } from "@webstudio-is/protocol";
import { mcpArgumentExamples } from "@webstudio-is/project-build/mcp";
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
      describe: "Schema topic to print",
      default: "api",
    })
    .option("json", {
      type: "boolean",
      describe: "Required. Print a machine-readable JSON schema to stdout",
      default: false,
    });

type SchemaOptions = StrictYargsOptionsToInterface<typeof schemaOptions> & {
  topic?: string;
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
  examples: (command.examples ?? []).map(formatApiUseCaseCommand),
}));

const commandGroups = cliCommandGroupMetadata.map(
  ({ command, description }) => ({
    name: command,
    summary: description,
    commands: cliCommands.filter(({ name }) => name.startsWith(`${command} `)),
  })
);

const apiSchema = {
  name: "webstudio-cli",
  version: 1,
  projectScope:
    "All high-level API commands operate on the single project configured by webstudio link or webstudio init --link.",
  requiredOutputMode:
    "Use --json. Successful responses are { ok: true, data, meta }. Failures are { ok: false, error, meta }.",
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
      "webstudio://project/guide",
    ],
    argumentExamples: mcpArgumentExamples,
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
      "Successful command JSON includes meta.session with operationId, buildId, version, source, committed, compatibility, namespace metadata, and diagnostics.",
  },
  useCases: useCaseScenarios,
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
    if (options.json !== true) {
      throw new Error("schema currently requires --json.");
    }
    if ((options.topic ?? "api") !== "api") {
      throw new Error(
        `Unknown schema topic "${options.topic}". Available topics: api`
      );
    }
    printJson(apiSchema);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    throw new HandledCliError();
  }
};
