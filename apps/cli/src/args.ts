import { parseArgs } from "node:util";

export const showHelp = () => console.info(HELP);

export enum Commands {
  "link" = "link",
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

export const HELP = `Usage:
    $ webstudio commands [flags...]
  Commands:
    link <shared link>              Login to Webstudio with shared link

    Flags:
    --help, -h                      Show this help message
    --version, -v                   Show the version of this script
`;
