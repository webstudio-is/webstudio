import { expect, test } from "vitest";
import { useCaseScenarios } from "./api-command-docs";

const removedShellCommands = [
  "whoami",
  "inspect",
  "snapshot",
  "apply-patch",
  "list-pages",
  "get-page",
  "get-page-by-path",
  "create-page",
  "update-page",
  "delete-page",
  "list-assets",
  "upload-asset",
  "replace-asset",
  "delete-asset",
  "list-domains",
  "create-domain",
] as const;

test("documents executable use-case scenarios with current CLI or MCP commands", () => {
  expect(useCaseScenarios.length).toBeGreaterThan(0);

  const names = useCaseScenarios.map(({ useCase }) => useCase);
  expect(new Set(names).size).toBe(names.length);
  for (const scenario of useCaseScenarios) {
    expect(scenario.useCase).not.toBe("");
    expect(scenario.commands.length).toBeGreaterThan(0);
    for (const command of scenario.commands) {
      expect(command).toMatch(/^(webstudio |MCP tool: )/);
      for (const removedCommand of removedShellCommands) {
        expect(command).not.toMatch(
          new RegExp(`^webstudio ${removedCommand}(?:\\\\s|$)`)
        );
      }
    }
  }
});
