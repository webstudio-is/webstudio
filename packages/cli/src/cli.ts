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
import { apiCommand } from "./commands/api-command";
import {
  apiCommandMetadata,
  getApiCommandOptions,
} from "./commands/api-command-metadata";
import { schema, schemaOptions } from "./commands/schema";
import { validatePatch, validatePatchOptions } from "./commands/validate-patch";
import { initFlow, initOptions } from "./commands/init-flow";
import makeCLI from "yargs";
import packageJson from "../package.json" assert { type: "json" };
import type { CommonYargsArgv } from "./commands/yargs-types";
import { isHandledCliError } from "./errors";

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
  for (const metadata of apiCommandMetadata) {
    const { command, description } = metadata;
    cmd.command(
      [command],
      description,
      getApiCommandOptions(metadata),
      (options) => apiCommand({ ...options, command })
    );
  }
  cmd.command(
    ["validate-patch"],
    "Validate Builder patch JSON locally without writing",
    validatePatchOptions,
    validatePatch
  );
  cmd.command(
    ["import"],
    "Import project bundle into another project",
    importOptions,
    importProject
  );
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
        `Webstudio CLI (${packageJson.version}) sets up, syncs, builds, imports, and automates the configured project.`
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
