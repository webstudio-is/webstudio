import { exit, argv, stdout } from "node:process";
import { hideBin } from "yargs/helpers";
import { listProjectSessionMcpTools } from "@webstudio-is/project-build/mcp";
import { publicApiOperations } from "@webstudio-is/protocol";
import { GLOBAL_CONFIG_FILE } from "./config";
import { createFileIfNotExists } from "./fs-utils";
import { link, linkOptions } from "./commands/link";
import { sync, syncOptions } from "./commands/sync";
import { importOptions, importProject } from "./commands/import";
import { build, buildOptions } from "./commands/build";
import { man, manOptions } from "./commands/man";
import { mcp, mcpOptions } from "./commands/mcp";
import { screenshot, screenshotOptions } from "./commands/screenshot";
import { preview, previewOptions } from "./commands/preview";
import { connect, connectOptions } from "./commands/connect";
import { apiCommand } from "./commands/api-command";
import {
  cliCommandGroupMetadata,
  cliCommandMetadata,
  getApiCommandOptions,
  topLevelCliCommandMetadata,
  type CliCommandMetadata,
} from "./commands/api-command-metadata";
import { schema, schemaOptions } from "./commands/schema";
import { initFlow, initOptions } from "./commands/init-flow";
import { registryInspect, registryInspectOptions } from "./commands/registry";
import { audit, auditOptions } from "./commands/audit";
import makeCLI from "yargs";
import packageJson from "../package.json" with { type: "json" };
import type { CommonYargsArgv } from "./commands/yargs-types";
import { isHandledCliError } from "./errors";

const cliCommandGroupDescriptions = new Map<string, string>(
  cliCommandGroupMetadata.map(({ command, description }) => [
    command,
    description,
  ])
);

const getGroupedCommands = (metadata: readonly CliCommandMetadata[]) => {
  const grouped = new Map<string, CliCommandMetadata[]>();
  const direct: CliCommandMetadata[] = [];

  for (const command of metadata) {
    const [group, action, extra] = command.cliCommand.split(" ");
    if (action === undefined || extra !== undefined) {
      direct.push(command);
      continue;
    }
    const commands = grouped.get(group) ?? [];
    commands.push(command);
    grouped.set(group, commands);
  }

  return { direct, grouped };
};

const registerApiCommand = (
  cmd: CommonYargsArgv,
  cliCommand: string,
  metadata: CliCommandMetadata
) => {
  cmd.command(
    [cliCommand],
    metadata.description,
    getApiCommandOptions(metadata),
    (options) => apiCommand({ ...options, command: metadata.operation })
  );
};

const topLevelCommandNames: ReadonlySet<string> = new Set([
  ...topLevelCliCommandMetadata.map((command) => command.command),
  ...cliCommandMetadata.map(
    (command) => command.cliCommand.split(" ")[0] ?? command.cliCommand
  ),
]);

const mcpOnlyToolNames = new Set(
  listProjectSessionMcpTools(publicApiOperations)
    .map((tool) => tool.name)
    .filter((name) => topLevelCommandNames.has(name) === false)
);

export const getTopLevelMcpToolHint = (args: readonly string[]) => {
  const tool = args.find(
    (arg) =>
      /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/i.test(arg) ||
      mcpOnlyToolNames.has(arg)
  );
  if (tool === undefined) {
    return;
  }
  return [
    "",
    `It looks like "${tool}" is an MCP tool.`,
    `Use the shell shortcut when unambiguous: webstudio ${tool}`,
    `Or use the explicit MCP form: webstudio mcp single-op-call ${tool}`,
    `Inside the Webstudio monorepo use: node packages/cli/local.js ${tool}`,
    `Explicit monorepo form: node packages/cli/local.js mcp single-op-call ${tool}`,
  ].join("\n");
};

const normalizeMcpShortcutArgs = (tool: string, args: readonly string[]) => {
  const optionIndex = args.findIndex((arg) => arg.startsWith("-"));
  const inputArgs =
    optionIndex === -1 ? args : args.slice(0, Math.max(0, optionIndex));
  const optionArgs = optionIndex === -1 ? [] : args.slice(optionIndex);
  if (
    tool === "workflow.next" &&
    inputArgs.length === 1 &&
    inputArgs[0]?.startsWith("{") === false &&
    inputArgs[0]?.startsWith("[") === false
  ) {
    const goal = inputArgs[0].replace(/^goal-/, "");
    return [JSON.stringify({ goal }), ...optionArgs];
  }
  if (inputArgs.length <= 1 || inputArgs.length % 2 !== 0) {
    return args;
  }
  const input: Record<string, string> = {};
  for (let index = 0; index < inputArgs.length; index += 2) {
    const key = inputArgs[index];
    const value = inputArgs[index + 1];
    if (
      key === undefined ||
      value === undefined ||
      key.startsWith("-") ||
      key.startsWith("{") ||
      key.startsWith("[")
    ) {
      return args;
    }
    input[key] = value;
  }
  return [JSON.stringify(input), ...optionArgs];
};

export const getTopLevelMcpToolForwardArgs = (args: readonly string[]) => {
  const [tool, ...rest] = args;
  if (tool === undefined) {
    return;
  }
  if (tool === "screenshot" && rest[0]?.trimStart().startsWith("{")) {
    return ["mcp", "single-op-call", tool, ...rest];
  }
  if (
    /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/i.test(tool) ||
    mcpOnlyToolNames.has(tool)
  ) {
    return [
      "mcp",
      "single-op-call",
      tool,
      ...normalizeMcpShortcutArgs(tool, rest),
    ];
  }
};

export const rootCliEpilogue = [
  "Project editing / LLM quick start:",
  "  webstudio man project-editing",
  "  webstudio meta.index",
  '  webstudio meta.get_more_tools \'{"tools":["insert-fragment"]}\'',
  '  webstudio insert-fragment \'{"parentInstanceId":"parent-id","fragment":"<$.Box ws:style={css`padding: 32px;`}><$.Heading>Title</$.Heading></$.Box>"}\' --dry-run',
  "",
  "Equivalent explicit MCP form:",
  "  webstudio mcp single-op-call meta.index",
  '  webstudio mcp single-op-call meta.get_more_tools \'{"tools":["insert-fragment"]}\'',
  '  webstudio mcp single-op-call insert-fragment \'{"parentInstanceId":"parent-id","fragment":"<$.Box ws:style={css`padding: 32px;`}><$.Heading>Title</$.Heading></$.Box>"}\' --dry-run',
  "",
  "Inside the Webstudio monorepo, use: node packages/cli/local.js ...",
  "MCP tool shortcuts are forwarded to mcp single-op-call for shell-driven agents.",
].join("\n");

export const registerCommands = (cmd: CommonYargsArgv) => {
  cmd.command(
    ["build"],
    "Build the project",
    (yargs: CommonYargsArgv) => {
      return buildOptions(yargs).demandOption(
        "template",
        "Please specify a template to use for the build"
      );
    },
    build
  );
  cmd.command(["link"], "Link the project with the cloud", linkOptions, link);
  cmd.command(["sync"], "Sync your project", syncOptions, sync);
  cmd.command(
    ["import"],
    "Import the synced project bundle into another project",
    importOptions,
    importProject
  );
  cmd.command(
    ["preview"],
    "Build and run the generated project production preview server for visual verification",
    previewOptions,
    preview
  );
  cmd.command(
    ["connect [client]"],
    "Generate the MCP client configuration for Claude Code, Codex, Cursor, or VS Code",
    connectOptions,
    connect
  );
  cmd.command(
    ["screenshot [url]"],
    "Capture a PNG screenshot of a URL or local generated project route",
    screenshotOptions,
    screenshot
  );
  cmd.command(
    ["audit"],
    "Audit project accessibility, SEO, security, assets, styles, and performance",
    auditOptions,
    audit
  );
  cmd.command(
    ["registry"],
    "Inspect external component registries without installing items",
    (yargs: CommonYargsArgv) =>
      yargs
        .command(
          ["inspect"],
          "Inspect one local or remote shadcn registry item",
          registryInspectOptions,
          registryInspect
        )
        .demandCommand(1, "Specify a registry command."),
    () => undefined
  );
  const { direct, grouped } = getGroupedCommands(cliCommandMetadata);
  for (const metadata of direct) {
    if (metadata.operation === "audit") {
      continue;
    }
    registerApiCommand(cmd, metadata.cliCommand, metadata);
  }
  for (const [group, commands] of grouped) {
    cmd.command(
      [group],
      cliCommandGroupDescriptions.get(group) ?? `Run ${group} commands`,
      (yargs: CommonYargsArgv) => {
        for (const metadata of commands) {
          const action = metadata.cliCommand.slice(group.length + 1);
          registerApiCommand(yargs, action, metadata);
        }
        return yargs.demandCommand(1, `Specify a ${group} command.`);
      },
      () => undefined
    );
  }
  cmd.command(
    ["schema [topic]"],
    "Print machine-readable command and patch schemas",
    schemaOptions,
    schema
  );
  cmd.command(
    ["man [topic]"],
    "Print long-form manuals with workflows and examples",
    manOptions,
    man
  );
  cmd.command(
    ["mcp"],
    "Run an MCP server over stdio, or call MCP tools from the shell",
    mcpOptions,
    mcp
  );
  cmd.command(["$0", "init"], "Setup the project", initOptions, initFlow);
};

export const handleOutputStreamError = (
  error: NodeJS.ErrnoException,
  exitProcess: typeof exit = exit
) => {
  if (error.code === "EPIPE") {
    exitProcess(0);
    return;
  }
  throw error;
};

export const installOutputStreamErrorHandler = () => {
  stdout.on("error", handleOutputStreamError);
};

export const main = async () => {
  installOutputStreamErrorHandler();
  try {
    await createFileIfNotExists(GLOBAL_CONFIG_FILE, "{}");

    const rawArgs = hideBin(argv);
    const forwardedArgs = getTopLevelMcpToolForwardArgs(rawArgs);
    const cmd: CommonYargsArgv = makeCLI(forwardedArgs ?? rawArgs)
      .strict()
      .fail(function (msg, err, yargs) {
        if (err) {
          throw err; // preserve stack
        }

        const hint = getTopLevelMcpToolHint(hideBin(argv));
        console.error(`${msg}${hint ?? ""}`);

        console.error(yargs.help());

        process.exit(1);
      })
      .wrap(null)
      .option("v", {
        describe: "Show version number",
        type: "boolean",
      })
      .option("h", {
        describe: "Show all commands",
        alias: "help",
        type: "boolean",
      })
      .scriptName("webstudio")
      .usage(
        `Webstudio CLI (${packageJson.version}) sets up, syncs, builds, publishes, and exposes MCP automation for the configured project.`
      )
      .epilogue(rootCliEpilogue);

    cmd.version(packageJson.version).alias("v", "version");
    registerCommands(cmd);

    await cmd.parse();
  } catch (error) {
    if (isHandledCliError(error)) {
      exit(1);
    }
    console.error(error);
    exit(1);
  }
};
