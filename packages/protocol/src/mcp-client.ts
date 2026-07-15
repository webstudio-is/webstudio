export const agentClients = ["claude", "codex", "cursor", "vscode"] as const;
export type AgentClient = (typeof agentClients)[number];

export const defaultAgentServerCommand = "npx -y webstudio@latest mcp";
export const agentServerName = "webstudio";

export const agentClientTargets = {
  claude: {
    path: ".mcp.json",
    rootKey: "mcpServers",
    hint: "Restart Claude Code in this directory and approve the webstudio server.",
  },
  cursor: {
    path: ".cursor/mcp.json",
    rootKey: "mcpServers",
    hint: "Reload Cursor and enable the webstudio server in MCP settings.",
  },
  vscode: {
    path: ".vscode/mcp.json",
    rootKey: "servers",
    extraServerFields: { type: "stdio" },
    hint: "Reload VS Code and start the webstudio server from the MCP view.",
  },
} as const;

export const parseAgentServerCommand = (serverCommand: string) => {
  const [command, ...args] = serverCommand.trim().split(/\s+/);
  if (command === undefined || command === "") {
    throw new Error("--command must not be empty.");
  }
  return { command, args };
};

export const createAgentServerEntry = (
  serverCommand: string,
  extraServerFields?: Record<string, unknown>
) => ({ ...extraServerFields, ...parseAgentServerCommand(serverCommand) });

export const createCodexAgentSnippet = (serverCommand: string) => {
  const { command, args } = parseAgentServerCommand(serverCommand);
  return [
    `[mcp_servers.${agentServerName}]`,
    `command = ${JSON.stringify(command)}`,
    `args = [${args.map((arg) => JSON.stringify(arg)).join(", ")}]`,
  ].join("\n");
};

export const createAgentClientConfiguration = (
  client: AgentClient,
  serverCommand = defaultAgentServerCommand
) => {
  if (client === "codex") {
    return {
      client,
      path: "~/.codex/config.toml",
      content: createCodexAgentSnippet(serverCommand),
      hint: "Restart Codex so it loads the webstudio MCP server.",
    };
  }
  const target = agentClientTargets[client];
  return {
    client,
    path: target.path,
    content: `${JSON.stringify(
      {
        [target.rootKey]: {
          [agentServerName]: createAgentServerEntry(
            serverCommand,
            "extraServerFields" in target ? target.extraServerFields : undefined
          ),
        },
      },
      null,
      2
    )}\n`,
    hint: target.hint,
  };
};

const quoteShellArgument = (value: string) =>
  `'${value.replaceAll("'", `'"'"'`)}'`;

export const createAgentSetupCommand = ({
  client,
  shareUrl,
}: {
  client: AgentClient;
  shareUrl: string;
}) =>
  [
    `npx -y webstudio@latest init --link ${quoteShellArgument(shareUrl)} --json`,
    "npx -y webstudio@latest sync",
    `npx -y webstudio@latest connect ${client}`,
  ].join(" && ");

export const createAgentShareUrl = ({
  builderUrl,
  authToken,
}: {
  builderUrl: string;
  authToken: string;
}) => {
  const url = new URL(builderUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("authToken", authToken);
  url.searchParams.set("mode", "design");
  return url.href;
};
