import { parseArgs } from "node:util";
import stripIndent from "strip-indent";

export const showHelp = () =>
  console.info(
    stripIndent(`
Usage:
  $ webstudio commands [flags...] \n
Commands:
  link <shared link> \t Login to Webstudio with shared link \n
Flags:
  --help     -h     Show this help message
  --version  -v     Show the version of this script
`)
  );

export enum Commands {
  "link" = "link",
  "sync" = "sync",
}

type DefaultArgs = Pick<
  ReturnType<
    typeof parseArgs<{
      options: typeof CLI_ARGS_OPTIONS;
    }>
  >,
  "values"
>;

export type Command = (
  args: DefaultArgs & { positionals: string[] }
) => Promise<void>;
export type SupportedCommands = Record<Commands, Command>;

export const CLI_ARGS_OPTIONS = {
  version: {
    type: "boolean" as const,
    short: "v",
  },
  help: {
    type: "boolean" as const,
    short: "h",
  },
};
