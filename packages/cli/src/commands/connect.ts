import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { cwd } from "node:process";
import { log } from "@clack/prompts";
import { getProjectPermissions } from "@webstudio-is/http-client";
import { x } from "tinyexec";
import {
  createFolderIfNotExists,
  isFileExists,
  writeFileAtomic,
} from "../fs-utils";
import { resolveApiConnection } from "../api-connection";
import { getStableErrorCode, isMissingApiAccessError } from "../error-codes";
import { HandledCliError } from "../errors";
import { isPlainRecord } from "../type-utils";
import { apiCompatibilityHeaders, getCliCompatibilityMessage } from "./api";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

const agentServerName = "webstudio";
const defaultAgentServerCommand = "npx -y webstudio@latest mcp";
const agentClients = ["claude", "codex", "cursor", "vscode"] as const;

export type ConnectClient = (typeof agentClients)[number];
type FileConnectClient = Exclude<ConnectClient, "codex">;

const clientTargets = {
  claude: {
    path: ".mcp.json",
    rootKey: "mcpServers",
    hint: "Restart Claude Code and approve the webstudio server.",
  },
  cursor: {
    path: ".cursor/mcp.json",
    rootKey: "mcpServers",
    hint: "Reload Cursor and enable the webstudio server in MCP settings.",
  },
  vscode: {
    path: ".vscode/mcp.json",
    rootKey: "servers",
    serverFields: { type: "stdio" },
    hint: "Reload VS Code and start the webstudio server from the MCP view.",
  },
} as const satisfies Record<
  FileConnectClient,
  {
    path: string;
    rootKey: string;
    hint: string;
    serverFields?: Record<string, unknown>;
  }
>;

const parseServerCommand = (serverCommand: string) => {
  const [command, ...args] = serverCommand.trim().split(/\s+/);
  if (command === undefined || command === "") {
    throw new Error("--command must not be empty.");
  }
  return { command, args };
};

type ServerCommand = ReturnType<typeof parseServerCommand>;

const createServerEntry = (
  serverCommand: ServerCommand,
  serverFields?: Record<string, unknown>
) => ({ ...serverFields, ...serverCommand });

const getCodexRegistrationArgs = ({ command, args }: ServerCommand) => [
  "mcp",
  "add",
  agentServerName,
  "--",
  command,
  ...args,
];

const getCodexRegistrationCommand = (serverCommand: ServerCommand) =>
  ["codex", ...getCodexRegistrationArgs(serverCommand)].join(" ");

export type ConnectFileResult =
  | "created"
  | "updated"
  | "unchanged"
  | "blocked-by-invalid-json";

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
    if (isPlainRecord(parsed) === false) {
      return { result: "blocked-by-invalid-json" };
    }
    config = parsed;
  }
  const servers = isPlainRecord(config[rootKey]) ? config[rootKey] : {};
  if (
    JSON.stringify(servers[agentServerName]) === JSON.stringify(serverEntry)
  ) {
    return { result: "unchanged" };
  }
  const content = `${JSON.stringify(
    { ...config, [rootKey]: { ...servers, [agentServerName]: serverEntry } },
    null,
    2
  )}\n`;
  return { content, result: current === undefined ? "created" : "updated" };
};

export type ConnectDependencies = {
  createFolderIfNotExists: typeof createFolderIfNotExists;
  isFileExists: typeof isFileExists;
  readFile: (path: string, encoding: "utf8") => Promise<string>;
  registerCodexServer: (serverCommand: ServerCommand) => Promise<void>;
  verifyProjectAccess: () => Promise<ProjectAccessResult>;
  writeFileAtomic: typeof writeFileAtomic;
};

export type ProjectAccessResult = { ok: true } | { ok: false; message: string };

type VerifyProjectAccessDependencies = {
  getProjectPermissions: typeof getProjectPermissions;
  resolveApiConnection: typeof resolveApiConnection;
};

const defaultVerifyProjectAccessDependencies: VerifyProjectAccessDependencies =
  { getProjectPermissions, resolveApiConnection };

export const verifyProjectAccess = async (
  dependencies = defaultVerifyProjectAccessDependencies
): Promise<ProjectAccessResult> => {
  let connection;
  try {
    connection = await dependencies.resolveApiConnection();
  } catch {
    return {
      ok: false,
      message:
        "This folder is not linked to a Webstudio project. Run `webstudio init --link <share-link>` with a current editable share link, then retry.",
    };
  }

  try {
    await dependencies.getProjectPermissions({
      ...connection,
      headers: apiCompatibilityHeaders,
    });
    return { ok: true };
  } catch (error) {
    const compatibilityMessage = getCliCompatibilityMessage(error, "connect");
    if (compatibilityMessage !== undefined) {
      return { ok: false, message: compatibilityMessage };
    }
    const code = getStableErrorCode(error);
    if (
      code === "UNAUTHORIZED" ||
      code === "FORBIDDEN" ||
      isMissingApiAccessError(error)
    ) {
      return {
        ok: false,
        message:
          "The saved project credential was rejected. Run `webstudio init --link <share-link>` with a current editable share link, then retry.",
      };
    }
    return {
      ok: false,
      message:
        "The linked Builder could not verify project access. Check that it is reachable and retry. If access has changed, relink with `webstudio init --link <share-link>`.",
    };
  }
};

const registerCodexServer = async (serverCommand: ServerCommand) => {
  await x("codex", getCodexRegistrationArgs(serverCommand));
  await x("codex", ["mcp", "get", agentServerName]);
};

const defaultDependencies: ConnectDependencies = {
  createFolderIfNotExists,
  isFileExists,
  readFile,
  registerCodexServer,
  verifyProjectAccess,
  writeFileAtomic,
};

export const connectOptions = (yargs: CommonYargsArgv) =>
  yargs
    .positional("client", {
      type: "string",
      choices: agentClients,
      describe: "Agent client to generate the MCP configuration for",
    })
    .option("command", {
      type: "string",
      default: defaultAgentServerCommand,
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
      "Register Webstudio MCP in Codex's global configuration"
    )
    .example(
      "webstudio connect cursor --print",
      "Print the Cursor MCP configuration without writing .cursor/mcp.json"
    )
    .epilogue(
      [
        "Connect configures the selected MCP client from the linked project directory.",
        "Project access is verified before client configuration is written.",
        "Existing config files are merged: only the webstudio server entry is created or replaced.",
        "Codex uses global configuration, so connect registers and verifies the server with the codex CLI.",
        "Run webstudio init --link and webstudio sync first so the MCP server can operate the project.",
      ].join("\n")
    );

type ConnectOptions = Partial<
  StrictYargsOptionsToInterface<typeof connectOptions>
>;

export const connect = async (
  options: ConnectOptions,
  dependencies: ConnectDependencies = defaultDependencies
) => {
  const serverCommand = options.command ?? defaultAgentServerCommand;
  const client = options.client;

  if (client === undefined) {
    log.message(
      [
        "Specify the agent client to connect:",
        ...agentClients.map((name) => `  webstudio connect ${name}`),
      ].join("\n")
    );
    return;
  }

  const parsedServerCommand = parseServerCommand(serverCommand);

  if (client === "codex") {
    if (options.print === true) {
      log.message(getCodexRegistrationCommand(parsedServerCommand));
      return;
    }
  } else if (options.print === true) {
    const target = clientTargets[client];
    const serverEntry = createServerEntry(
      parsedServerCommand,
      "serverFields" in target ? target.serverFields : undefined
    );
    const configuration = `${JSON.stringify(
      { [target.rootKey]: { [agentServerName]: serverEntry } },
      null,
      2
    )}\n`;
    log.message(`${target.path}\n\n${configuration}`);
    return;
  }

  const access = await dependencies.verifyProjectAccess();
  if (access.ok === false) {
    log.error(access.message);
    throw new HandledCliError();
  }

  if (client === "codex") {
    try {
      await dependencies.registerCodexServer(parsedServerCommand);
    } catch {
      log.error(
        "Codex could not register the Webstudio MCP server. Make sure the `codex` command is installed and available, or run `webstudio connect codex --print` for the exact command."
      );
      throw new HandledCliError();
    }
    log.success(
      "Registered and verified the webstudio MCP server in Codex. Restart Codex, then ask it to use Webstudio MCP and list the project pages."
    );
    return;
  }

  const target = clientTargets[client];
  const serverEntry = createServerEntry(
    parsedServerCommand,
    "serverFields" in target ? target.serverFields : undefined
  );
  const completionHint = `${target.hint} Ask your agent to use Webstudio MCP and list the project pages.`;

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
    log.success(`${target.path} is already configured. ${completionHint}`);
    return;
  }

  await dependencies.createFolderIfNotExists(dirname(path));
  await dependencies.writeFileAtomic(path, content ?? "");
  log.success(
    `${result === "created" ? "Created" : "Updated"} ${target.path} with the ${agentServerName} MCP server. ${completionHint}`
  );
};
