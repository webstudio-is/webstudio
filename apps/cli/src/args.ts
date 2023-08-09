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

type Commands = "link" | "sync" | "build";

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
  type: {
    type: "string" as const,
    short: "t",
    default: "remix-app-server",
  },
};

export type File = {
  name: string;
  content: string;
  encoding: "utf-8";
};

export type Folder = {
  name: string;
  files: File[];
  subFolders: Folder[];
};

export type ProjectTarget = "defaults" | "vercel" | "remix-app-server";

export const SupportedProjects: Record<ProjectTarget, boolean> = {
  defaults: true,
  vercel: true,
  "remix-app-server": true,
};
