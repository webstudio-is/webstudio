import { exit, argv } from "node:process";
// eslint-disable-next-line import/no-internal-modules
import { hideBin } from "yargs/helpers";
import { GLOBAL_CONFIG_FILE } from "./config";
import { ensureFileInPath } from "./fs-utils";
import { link } from "./commands/link";
import { sync } from "./commands/sync";
import { build, buildOptions } from "./commands/build";
import makeCLI from "yargs";
import packageJson from "../package.json" assert { type: "json" };
import type { CommonYargsArgv } from "./commands/yargs-types";

export const main = async () => {
  try {
    await ensureFileInPath(GLOBAL_CONFIG_FILE, "{}");

    const cmd: CommonYargsArgv = makeCLI(hideBin(argv))
      .strict()
      .fail(function (msg, err, yargs) {
        if (err) {
          throw err; // preserve stack
        }
        // eslint-disable-next-line no-console
        console.error(msg);
        // eslint-disable-next-line no-console
        console.error(yargs.help());

        process.exit(1);
      })
      .wrap(null)
      .option("v", {
        describe: "Show version number",
        alias: "version",
        type: "boolean",
      })
      .option("h", {
        describe: "Show version number",
        alias: "help",
        type: "boolean",
      })
      .scriptName("webstudio")
      .demandCommand(1, "Command is required");

    cmd.version(packageJson.version).alias("v", "version");

    cmd.command(["build"], "build the project", buildOptions, build);
    cmd.command(["link"], "link the project from your workspace", {}, link);
    cmd.command(["sync"], "sync your project", {}, sync);

    await cmd.parse();
  } catch (error) {
    console.error(error);
    exit(1);
  }
};
