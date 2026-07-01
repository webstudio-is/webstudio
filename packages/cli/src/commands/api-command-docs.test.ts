import { expect, test } from "vitest";
import { createProjectSessionMcpCore } from "@webstudio-is/project-build/mcp";
import { publicApiOperations } from "@webstudio-is/protocol";
import {
  apiCommandMetadata,
  highLevelCliCommands,
  topLevelCliCommandMetadata,
} from "./api-command-metadata";
import { useCaseScenarios } from "./api-command-docs";
import { readCliDoc } from "../docs";

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

const getDocumentedCommands = () => {
  const knownCliCommands = [
    ...highLevelCliCommands.map(({ command }) => command),
    ...topLevelCliCommandMetadata.map(({ command }) => command),
  ].sort((left, right) => right.length - left.length);
  return new Set(
    useCaseScenarios
      .flatMap(({ commands }) => commands)
      .flatMap((command) => {
        const mcpMatch = command.match(/^MCP tool: ([a-z0-9._-]+)/);
        if (mcpMatch !== null) {
          return [mcpMatch[1]];
        }
        if (command.startsWith("webstudio ") === false) {
          return [];
        }
        const withoutBinary = command.slice("webstudio ".length);
        const cliCommand = knownCliCommands.find(
          (knownCommand) =>
            withoutBinary === knownCommand ||
            withoutBinary.startsWith(`${knownCommand} `)
        );
        return cliCommand === undefined ? [] : [cliCommand];
      })
  );
};

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

test("documents every public API operation in use-case scenarios", () => {
  const documentedCommands = getDocumentedCommands();
  const cliCommandByOperation = new Map<string, string>(
    highLevelCliCommands.map(({ command, operation }) => [operation, command])
  );

  for (const { command } of apiCommandMetadata) {
    expect(documentedCommands).toContain(
      cliCommandByOperation.get(command) ?? command
    );
  }
});

test("documents every MCP session and vision tool in use-case scenarios", () => {
  const documentedTools = getDocumentedCommands();

  expect(Array.from(documentedTools)).toEqual(
    expect.arrayContaining([
      "meta.index",
      "meta.guide",
      "meta.get_more_tools",
      "import",
      "status",
      "refresh",
      "reset-session",
      "preview.start",
      "preview.status",
      "screenshot",
      "screenshot.diff",
      "vision.install-ocr",
    ])
  );
});

test("documents MCP use cases with JSON inputs instead of CLI flags", () => {
  const apiUseCases = readCliDoc("api-use-cases");
  expect(apiUseCases).not.toMatch(/^- MCP tool: .*(?:\(--| --[a-z])/m);
  expect(apiUseCases).not.toMatch(/^- MCP tool: .*\(\{/m);

  for (const line of apiUseCases.match(/^- MCP tool: .+$/gm) ?? []) {
    const match = line.match(/^- MCP tool: [a-z0-9._-]+ (.+)$/);
    expect(match, line).not.toBeNull();
    expect(() => JSON.parse(match?.[1] ?? "")).not.toThrow();
  }
});

test("MCP capability index covers every public API operation", async () => {
  const adapter = createProjectSessionMcpCore({
    operations: publicApiOperations,
    createProjectSession: () => {
      throw new Error("meta.index must not initialize a ProjectSession.");
    },
    executeOperation: async () => {
      throw new Error("meta.index must not execute operations.");
    },
  });
  const index = await adapter.callTool({ name: "meta.index" });
  const capabilities = (
    index.structuredContent.data as {
      capabilities: { tools: string[] }[];
    }
  ).capabilities;
  const indexedTools = new Set(
    capabilities.flatMap((capability) => capability.tools)
  );

  for (const { command } of apiCommandMetadata) {
    expect(indexedTools).toContain(command);
  }
});

test("documents that MCP visual verification requires current generated files", () => {
  expect(
    useCaseScenarios.find(
      (scenario) =>
        scenario.useCase === "Visually verify rendered work with AI vision"
    )?.notes
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining("generated project files are current"),
    ])
  );
});
