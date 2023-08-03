import { parseArgs } from "node:util";
import stripIndent from "strip-indent";

export const showHelp = () => console.info(stripIndent(HELP));

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

export const HELP = `\n Usage:
\t $ webstudio commands [flags...] \n
\t Commands:
\t\t link <shared link> \t Login to Webstudio with shared link \n
\t Flags:
\t\t --help, -h \t\t Show this help message
\t\t --version, -v \t\t Show the version of this script
`;
