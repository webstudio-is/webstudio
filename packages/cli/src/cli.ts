import { exit, argv } from "node:process";
import { hideBin } from "yargs/helpers";
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
import { apiCommand } from "./commands/api-command";
import {
  cliCommandGroupMetadata,
  cliCommandMetadata,
  getApiCommandOptions,
  type CliCommandMetadata,
} from "./commands/api-command-metadata";
import { schema, schemaOptions } from "./commands/schema";
import { initFlow, initOptions } from "./commands/init-flow";
import makeCLI from "yargs";
import packageJson from "../package.json" assert { type: "json" };
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
    "Run the generated project dev server for visual verification",
    (yargs: CommonYargsArgv) => {
      return previewOptions(yargs).demandOption(
        "template",
        "Please specify a template to use for the preview"
      );
    },
    preview
  );
  cmd.command(
    ["screenshot <url>"],
    "Capture a PNG screenshot of a URL with an installed Chromium-family browser",
    screenshotOptions,
    screenshot
  );
  const { direct, grouped } = getGroupedCommands(cliCommandMetadata);
  for (const metadata of direct) {
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
    "Run an MCP server over stdio for the configured project",
    mcpOptions,
    mcp
  );
  cmd.command(["$0", "init"], "Setup the project", initOptions, initFlow);
};

export const main = async () => {
  try {
    await createFileIfNotExists(GLOBAL_CONFIG_FILE, "{}");

    const cmd: CommonYargsArgv = makeCLI(hideBin(argv))
      .strict()
      .fail(function (msg, err, yargs) {
        if (err) {
          throw err; // preserve stack
        }

        console.error(msg);

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
      );

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
