import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { cwd } from "node:process";
import { log } from "@clack/prompts";
import {
  agentClients,
  agentClientTargets,
  agentServerName,
  createAgentServerEntry,
  createCodexAgentSnippet,
  defaultAgentServerCommand,
  type AgentClient,
} from "@webstudio-is/protocol";
import {
  createFolderIfNotExists,
  isFileExists,
  writeFileAtomic,
} from "../fs-utils";
import { LOCAL_CONFIG_FILE } from "../config";
import { HandledCliError } from "../errors";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

export const connectClients = agentClients;
export type ConnectClient = AgentClient;
export const defaultServerCommand = defaultAgentServerCommand;
export const mcpServerName = agentServerName;

export type ConnectFileResult =
  | "created"
  | "updated"
  | "unchanged"
  | "blocked-by-invalid-json";

const jsonClientTargets = agentClientTargets;
export const createServerEntry = createAgentServerEntry;
export const createCodexSnippet = createCodexAgentSnippet;

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

/**
 * Merge the webstudio server entry into an existing client config while
 * preserving every user-owned field and other configured servers. Only the
 * `<rootKey>.webstudio` entry is ever created or replaced.
 */
export const mergeServerConfig = ({
  current,
  rootKey,
  serverEntry,
}: {
  current: string | undefined;
  rootKey: string;
  serverEntry: Record<string, unknown>;
}): { content?: string; result: ConnectFileResult } => {
  let config: Record<string, unknown> = {};
  if (current !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(current);
    } catch {
      return { result: "blocked-by-invalid-json" };
    }
    if (isJsonObject(parsed) === false) {
      return { result: "blocked-by-invalid-json" };
    }
    config = parsed;
  }
  const servers = isJsonObject(config[rootKey]) ? config[rootKey] : {};
  if (JSON.stringify(servers[mcpServerName]) === JSON.stringify(serverEntry)) {
    return { result: "unchanged" };
  }
  const content = `${JSON.stringify(
    { ...config, [rootKey]: { ...servers, [mcpServerName]: serverEntry } },
    null,
    2
  )}\n`;
  return { content, result: current === undefined ? "created" : "updated" };
};

export type ConnectDependencies = {
  createFolderIfNotExists: typeof createFolderIfNotExists;
  isFileExists: typeof isFileExists;
  readFile: (path: string, encoding: "utf8") => Promise<string>;
  writeFileAtomic: typeof writeFileAtomic;
};

const defaultDependencies: ConnectDependencies = {
  createFolderIfNotExists,
  isFileExists,
  readFile,
  writeFileAtomic,
};

export const connectOptions = (yargs: CommonYargsArgv) =>
  yargs
    .positional("client", {
      type: "string",
      choices: connectClients,
      describe: "Agent client to generate the MCP configuration for",
    })
    .option("command", {
      type: "string",
      default: defaultServerCommand,
      describe:
        "Command used by the client to start the Webstudio MCP server over stdio",
    })
    .option("print", {
      type: "boolean",
      default: false,
      describe: "Print the configuration instead of writing the config file",
    })
    .example(
      "webstudio connect claude",
      "Write .mcp.json so Claude Code can operate the linked project"
    )
    .example(
      "webstudio connect codex",
      "Print the Codex config.toml snippet and the codex mcp add command"
    )
    .example(
      "webstudio connect cursor --print",
      "Print the Cursor MCP configuration without writing .cursor/mcp.json"
    )
    .epilogue(
      [
        "Connect generates the exact MCP client configuration for the current project directory.",
        "Existing config files are merged: only the webstudio server entry is created or replaced.",
        "Run webstudio link and webstudio sync first so the MCP server can operate the project.",
      ].join("\n")
    );

type ConnectOptions = Partial<
  StrictYargsOptionsToInterface<typeof connectOptions>
>;

export const connect = async (
  options: ConnectOptions,
  dependencies: ConnectDependencies = defaultDependencies
) => {
  const serverCommand = options.command ?? defaultServerCommand;
  const client = options.client;

  if (client === undefined) {
    log.message(
      [
        "Specify the agent client to connect:",
        ...connectClients.map((name) => `  webstudio connect ${name}`),
      ].join("\n")
    );
    return;
  }

  if ((await dependencies.isFileExists(LOCAL_CONFIG_FILE)) === false) {
    log.warn(
      "This directory has no linked Webstudio project. The MCP server needs one at runtime: run `webstudio link` and `webstudio sync` before using the agent."
    );
  }

  if (client === "codex") {
    const snippet = createCodexSnippet(serverCommand);
    log.message(
      [
        "Codex reads MCP servers from ~/.codex/config.toml. Add the server with:",
        "",
        `  codex mcp add ${mcpServerName} -- ${serverCommand}`,
        "",
        "or append this snippet to ~/.codex/config.toml:",
        "",
        snippet,
      ].join("\n")
    );
    return;
  }

  const target = jsonClientTargets[client];
  const serverEntry = createServerEntry(
    serverCommand,
    "extraServerFields" in target ? target.extraServerFields : undefined
  );

  if (options.print === true) {
    const { content } = mergeServerConfig({
      current: undefined,
      rootKey: target.rootKey,
      serverEntry,
    });
    log.message(`${target.path}\n\n${content}`);
    return;
  }

  const path = join(cwd(), target.path);
  const current = (await dependencies.isFileExists(path))
    ? await dependencies.readFile(path, "utf8")
    : undefined;
  const { content, result } = mergeServerConfig({
    current,
    rootKey: target.rootKey,
    serverEntry,
  });

  if (result === "blocked-by-invalid-json") {
    log.error(
      `${target.path} exists but is not a valid JSON object. Fix or remove it, then run webstudio connect ${client} again.`
    );
    throw new HandledCliError();
  }

  if (result === "unchanged") {
    log.success(`${target.path} is already configured. ${target.hint}`);
    return;
  }

  await dependencies.createFolderIfNotExists(dirname(path));
  await dependencies.writeFileAtomic(path, content ?? "");
  log.success(
    `${result === "created" ? "Created" : "Updated"} ${target.path} with the ${mcpServerName} MCP server. ${target.hint}`
  );
};
