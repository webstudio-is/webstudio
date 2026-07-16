export const defaultAgentServerCommand = "npx -y webstudio@latest mcp";
export const agentServerName = "webstudio";

export const agentClientDefinitions = [
  {
    client: "claude",
    format: "json",
    label: "Claude Code",
    path: ".mcp.json",
    rootKey: "mcpServers",
    hint: "Restart Claude Code in this directory and approve the webstudio server.",
  },
  {
    client: "codex",
    format: "toml",
    label: "Codex",
    path: "~/.codex/config.toml",
    hint: "Restart Codex so it loads the webstudio MCP server.",
  },
  {
    client: "cursor",
    format: "json",
    label: "Cursor",
    path: ".cursor/mcp.json",
    rootKey: "mcpServers",
    hint: "Reload Cursor and enable the webstudio server in MCP settings.",
  },
  {
    client: "vscode",
    format: "json",
    label: "VS Code",
    path: ".vscode/mcp.json",
    rootKey: "servers",
    extraServerFields: { type: "stdio" },
    hint: "Reload VS Code and start the webstudio server from the MCP view.",
  },
] as const;

export type AgentClient = (typeof agentClientDefinitions)[number]["client"];
export type AgentClientDefinition = (typeof agentClientDefinitions)[number];

export const agentClients = agentClientDefinitions.map(({ client }) => client);

export const getAgentClientDefinition = <Client extends AgentClient>(
  client: Client
) =>
  agentClientDefinitions.find(
    (definition) => definition.client === client
  ) as Extract<(typeof agentClientDefinitions)[number], { client: Client }>;

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
  const target = getAgentClientDefinition(client);
  if (target.format === "toml") {
    return {
      client,
      label: target.label,
      path: target.path,
      content: createCodexAgentSnippet(serverCommand),
      hint: target.hint,
    };
  }
  return {
    client,
    label: target.label,
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

export const createAgentQuickstart = ({
  client,
  shareUrl,
  serverCommand = defaultAgentServerCommand,
}: {
  client: AgentClient;
  shareUrl?: string;
  serverCommand?: string;
}) => {
  const configuration = createAgentClientConfiguration(client, serverCommand);
  return {
    client,
    label: configuration.label,
    configuration,
    completion: {
      connection: configuration.hint,
      firstRead:
        "Ask your agent to use Webstudio MCP and list the project pages.",
    },
    setupCommand:
      shareUrl === undefined
        ? undefined
        : [
            `npx -y webstudio@latest init --link ${quoteShellArgument(shareUrl)} --json`,
            "npx -y webstudio@latest sync",
            `npx -y webstudio@latest connect ${client}`,
          ].join(" && "),
  };
};

export const createAgentSetupCommand = ({
  client,
  shareUrl,
}: {
  client: AgentClient;
  shareUrl: string;
}) => createAgentQuickstart({ client, shareUrl }).setupCommand ?? "";

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
