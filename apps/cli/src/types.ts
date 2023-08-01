import { parseArgs } from "node:util";
import { CLI_ARGS_OPTIONS } from "./constants";

export type Config = {
  [projectId: string]: Auth;
};

export type Auth = {
  token: string;
  host: string;
} | null;

export interface File {
  name: string;
  content: string;
  encoding: "utf-8";
}

export interface Folder {
  name: string;
  files: File[];
  subFolders: Folder[];
}

export type ComponentsByPage = {
  [path: string]: Set<string>;
};

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
