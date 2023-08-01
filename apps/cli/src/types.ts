import { parseArgs } from "node:util";
import { CLI_ARGS_OPTIONS } from "./constants";

export enum ProjectType {
  "remix-app-server" = "remix-app-server",
}

export enum Commands {
  "link" = "link",
}

export type Command = (
  args: Pick<
    ReturnType<
      typeof parseArgs<{
        options: typeof CLI_ARGS_OPTIONS;
      }>
    >,
    "values"
  > & { positionals: string[] }
) => Promise<void>;
export type SupportedCommands = Record<Commands, Command>;
