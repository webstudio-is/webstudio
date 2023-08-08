import { parseArgs } from "node:util";
import stripIndent from "strip-indent";

export const showHelp = () =>
  console.info(
    stripIndent(`
      Usage:
      $ webstudio commands [flags...]

      Commands:
      link       Link to an existing webstudio project
      sync       Sync the linked webstudio project with the latest build

     Flags:
     --help     -h     Show this help message
    --version  -v     Show the version of this script
`)
  );

type DefaultArgs = Pick<
  ReturnType<
    typeof parseArgs<{
      options: typeof CLI_ARGS_OPTIONS;
    }>
  >,
  "values"
>;

type Commands = "link" | "sync";

export type Command = (
  args: DefaultArgs & { positionals: string[] }
) => Promise<void>;

export type SupportedCommands = {
  [key in Commands]: Command;
} & { [key: string]: Command };

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
