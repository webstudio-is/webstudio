export const agentClients = ["claude", "codex", "cursor", "vscode"] as const;
export type AgentClient = (typeof agentClients)[number];

export const defaultAgentServerCommand = "npx -y webstudio@latest mcp";
export const agentServerName = "webstudio";

export const agentClientDefinitions = {
  claude: {
    format: "json",
    label: "Claude Code",
    path: ".mcp.json",
    rootKey: "mcpServers",
    hint: "Restart Claude Code in this directory and approve the webstudio server.",
  },
  codex: {
    format: "toml",
    label: "Codex",
    path: "~/.codex/config.toml",
    hint: "Restart Codex so it loads the webstudio MCP server.",
  },
  cursor: {
    format: "json",
    label: "Cursor",
    path: ".cursor/mcp.json",
    rootKey: "mcpServers",
    hint: "Reload Cursor and enable the webstudio server in MCP settings.",
  },
  vscode: {
    format: "json",
    label: "VS Code",
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
  const target = agentClientDefinitions[client];
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
  const steps = [
    ...(shareUrl === undefined
      ? []
      : [
          {
            phase: "project-linked" as const,
            label: "Link the project",
            command: `npx -y webstudio@latest init --link ${quoteShellArgument(shareUrl)} --json`,
          },
        ]),
    {
      phase: "project-synced" as const,
      label: "Sync the project",
      command: "npx -y webstudio@latest sync",
    },
    {
      phase: "client-configured" as const,
      label: `Configure ${configuration.label}`,
      command: `npx -y webstudio@latest connect ${client}`,
    },
    {
      phase: "mcp-connected" as const,
      label: configuration.hint,
    },
    {
      phase: "first-read" as const,
      label: "Ask your agent to use Webstudio MCP and list the project pages.",
    },
  ];
  return {
    client,
    label: configuration.label,
    configuration,
    steps,
    setupCommand:
      shareUrl === undefined
        ? undefined
        : steps
            .flatMap((step) => (step.command === undefined ? [] : step.command))
            .join(" && "),
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
