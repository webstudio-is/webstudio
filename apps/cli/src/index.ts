import { parseArgs } from "node:util";
import { CLI_ARGS_OPTIONS, GLOBAL_CONFIG_FILE } from "./constants";
import { ensureFileInPath, showHelp } from "./utils";
import { link } from "./link";
import type { Commands, SupportedCommands } from "./types";

const commands: SupportedCommands = {
  link,
};

export const main = async () => {
  try {
    await ensureFileInPath(GLOBAL_CONFIG_FILE, JSON.stringify({}));
    const args = parseArgs({
      args: process.argv.slice(2),
      options: CLI_ARGS_OPTIONS,
      allowPositionals: true,
    });

    console.log(args.positionals);

    const command = commands[args.positionals[2] as Commands];

    if (command === undefined) {
      throw new Error(`Command ${args.positionals[0]} is not supported`);
    }

    await command(args);
  } catch (error) {
    console.error(error);
    console.log(showHelp());
  }
};
