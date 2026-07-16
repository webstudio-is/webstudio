import { describe, expect, test } from "vitest";
import { agentClients } from "@webstudio-is/protocol";
import { createConnectAgentViewModel } from "./section-connect-agent";

describe("Connect your Agent", () => {
  test.each(agentClients)("shows a complete %s quickstart", (client) => {
    const view = createConnectAgentViewModel({
      client,
      shareUrl: "https://example.com/?authToken=private&mode=design",
    });

    expect(view.configuration.client).toBe(client);
    expect(view.setupCommand).toContain(`connect ${client}`);
    expect(view.steps.map(({ phase }) => phase)).toEqual([
      "project-linked",
      "project-synced",
      "client-configured",
      "mcp-connected",
      "first-read",
    ]);
  });

  test("does not expose a setup command before a share link exists", () => {
    const view = createConnectAgentViewModel({ client: "vscode" });

    expect(view.setupCommand).toBeUndefined();
    expect(view.configuration.path).toBe(".vscode/mcp.json");
  });
});
