import { parseArgs } from "node:util";
import { exit } from "node:process";
import { GLOBAL_CONFIG_FILE } from "./constants";
import { ensureFileInPath } from "./fs-utils";
import { link } from "./commands/link";
import { sync } from "./commands/sync";
import { showHelp, CLI_ARGS_OPTIONS, Commands } from "./args";
import type { SupportedCommands } from "./args";
import packageJSON from "../package.json" assert { type: "json" };

const commands: SupportedCommands = {
  link,
  sync,
};

export const main = async () => {
  try {
    await ensureFileInPath(GLOBAL_CONFIG_FILE, "{}");
    const args = parseArgs({
      args: process.argv.slice(2),
      options: CLI_ARGS_OPTIONS,
      allowPositionals: true,
    });

    if (args.values?.version) {
      console.info(packageJSON.version);
      return;
    }

    if (args.values?.help) {
      showHelp();
      return;
    }

    const command = commands[args.positionals[0] as Commands];
    if (command === undefined) {
      throw new Error(`No command provided`);
    }

    await command(args);
    exit(0);
  } catch (error) {
    console.error(error);
    showHelp();
    exit(1);
  }
};
