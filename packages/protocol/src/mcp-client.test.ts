import { describe, expect, test } from "vitest";
import {
  agentClients,
  createAgentClientConfiguration,
  createAgentQuickstart,
  createAgentShareUrl,
  createAgentSetupCommand,
  defaultAgentServerCommand,
} from "./mcp-client";

describe("agent connection configuration", () => {
  test.each(agentClients)("generates a valid %s configuration", (client) => {
    const configuration = createAgentClientConfiguration(client);

    expect(configuration.client).toBe(client);
    expect(configuration.content).toContain("webstudio");
    expect(configuration.content).toContain("webstudio@latest");
    expect(configuration.hint.length).toBeGreaterThan(10);

    if (client === "codex") {
      expect(configuration.path).toBe("~/.codex/config.toml");
      expect(configuration.content).toContain("[mcp_servers.webstudio]");
      return;
    }

    const parsed = JSON.parse(configuration.content);
    const root = client === "vscode" ? parsed.servers : parsed.mcpServers;
    expect(root.webstudio).toMatchObject({
      command: "npx",
      args: ["-y", "webstudio@latest", "mcp"],
    });
  });

  test("keeps authentication in the setup command, not client configuration", () => {
    const shareUrl =
      "https://p-project.wstd.dev/?authToken=secret-token&mode=design";
    const command = createAgentSetupCommand({ client: "claude", shareUrl });
    const configuration = createAgentClientConfiguration("claude");

    expect(command).toContain(`init --link '${shareUrl}' --json`);
    expect(command).toContain("sync");
    expect(command).toContain("connect claude");
    expect(command.match(/secret-token/g)).toHaveLength(1);
    expect(configuration.content).not.toContain("secret-token");
  });

  test("quotes share links without changing the shared server command", () => {
    const command = createAgentSetupCommand({
      client: "codex",
      shareUrl: "https://example.com/project?name=O'Brien",
    });

    expect(command).toContain(`O'\"'\"'Brien`);
    expect(createAgentClientConfiguration("codex").content).toContain(
      `args = ["-y", "webstudio@latest", "mcp"]`
    );
    expect(defaultAgentServerCommand).toBe("npx -y webstudio@latest mcp");
  });

  test.each(agentClients)(
    "generates the same complete %s quickstart",
    (client) => {
      const quickstart = createAgentQuickstart({
        client,
        shareUrl: "https://example.com/?authToken=secret&mode=design",
      });

      expect(quickstart.setupCommand).toContain(
        `npx -y webstudio@latest connect ${client}`
      );
      expect(quickstart.completion).toEqual({
        connection: quickstart.configuration.hint,
        firstRead:
          "Ask your agent to use Webstudio MCP and list the project pages.",
      });
      expect(quickstart.configuration.client).toBe(client);
    }
  );
});

test("creates a minimal revocable Builder share URL", () => {
  expect(
    createAgentShareUrl({
      builderUrl:
        "https://p-project.wstd.dev:5173/?authToken=stale&mode=preview&private=value#fragment",
      authToken: "fresh token",
    })
  ).toBe("https://p-project.wstd.dev:5173/?authToken=fresh+token&mode=design");
});
