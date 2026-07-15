import { expect, test } from "vitest";
import { createProjectSessionMcpCore } from "@webstudio-is/project-build/mcp";
import { getRuntimeGeneratedInputPaths } from "@webstudio-is/project-build/contracts";
import { builderRuntimeOperations } from "@webstudio-is/project-build/runtime";
import { publicApiOperations } from "@webstudio-is/protocol";
import {
  apiCommandMetadata,
  highLevelCliCommands,
  mcpOnlyApiCommandMetadata,
  topLevelCliCommandMetadata,
} from "./api-command-metadata";
import { useCaseCoverageScenarios, useCaseScenarios } from "./api-command-docs";
import { readCliDoc } from "../docs";

const getDocumentedCommands = () => {
  const knownCliCommands = [
    ...highLevelCliCommands.map(({ command }) => command),
    ...topLevelCliCommandMetadata.map(({ command }) => command),
  ].sort((left, right) => right.length - left.length);
  return new Set(
    useCaseCoverageScenarios
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

const createMetadataOnlyMcpAdapter = () =>
  createProjectSessionMcpCore({
    operations: publicApiOperations,
    createProjectSession: () => {
      throw new Error(
        "MCP metadata reads must not initialize a ProjectSession."
      );
    },
    executeOperation: async () => {
      throw new Error("MCP metadata reads must not execute operations.");
    },
    importProject: async () => ({ imported: true }),
    captureScreenshot: async () => ({
      output: "current.png",
      browserPath: "/browser",
      browser: "chromium",
      viewport: { width: 1440, height: 900 },
      fullPage: false,
      elapsedMs: 0,
      url: "http://localhost",
      warnings: [],
    }),
    diffScreenshots: async () => ({
      totalPixels: 0,
      differentPixels: 0,
      mismatchPercentage: 0,
      summary: "No visual changes.",
      regions: [],
      output: "diff.png",
      textAnalysis: {
        status: "skipped",
        provider: "tesseract",
        changes: [],
      },
      warnings: [],
    }),
    installOcr: async () => ({
      installed: false,
      alreadyAvailable: true,
      installUrl: "",
      warnings: [],
    }),
    startPreview: async () => ({ url: "http://localhost:5173", running: true }),
    getPreviewStatus: async () => ({
      url: "http://localhost:5173",
      running: true,
    }),
  });

const getMcpVisibleToolNames = () =>
  new Set(
    createMetadataOnlyMcpAdapter()
      .listTools()
      .map((tool) => tool.name)
  );

test("documents executable use-case scenarios with current CLI or MCP commands", () => {
  expect(useCaseScenarios.length).toBeGreaterThan(0);

  const names = useCaseScenarios.map(({ useCase }) => useCase);
  expect(new Set(names).size).toBe(names.length);
  for (const scenario of useCaseScenarios) {
    expect(scenario.useCase).not.toBe("");
    expect(scenario.commands.length).toBeGreaterThan(0);
    for (const command of scenario.commands) {
      expect(command).toMatch(/^(webstudio |MCP tool: )/);
      for (const { command: mcpOnlyCommand } of mcpOnlyApiCommandMetadata) {
        expect(command).not.toMatch(
          new RegExp(`^webstudio ${mcpOnlyCommand}(?:\\\\s|$)`)
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
  const mcpVisibleToolNames = getMcpVisibleToolNames();

  for (const { command } of apiCommandMetadata) {
    if (
      cliCommandByOperation.has(command) === false &&
      mcpVisibleToolNames.has(command) === false
    ) {
      continue;
    }
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

test("documents MCP examples with current tool input fields", () => {
  const adapter = createMetadataOnlyMcpAdapter();
  const toolInputFields = new Map(
    adapter
      .listTools()
      .map((tool) => [tool.name, new Set(tool.annotations.inputFields)])
  );
  const toolRequiredInputFields = new Map(
    adapter
      .listTools()
      .map((tool) => [tool.name, tool.annotations.requiredInputFields])
  );
  const apiUseCases = readCliDoc("api-use-cases");

  for (const line of apiUseCases.match(/^- MCP tool: .+$/gm) ?? []) {
    const match = line.match(/^- MCP tool: ([a-z0-9._-]+) (.+)$/);
    expect(match, line).not.toBeNull();
    const [, name = "", rawInput = "{}"] = match ?? [];
    const fields = toolInputFields.get(name);
    expect(fields, line).toBeDefined();
    const input = JSON.parse(rawInput);
    if (
      input !== null &&
      typeof input === "object" &&
      Array.isArray(input) === false
    ) {
      for (const field of Object.keys(input)) {
        expect(fields?.has(field), line).toBe(true);
      }
      for (const field of toolRequiredInputFields.get(name) ?? []) {
        expect(Object.hasOwn(input, field), line).toBe(true);
      }
    }
  }
});

test("does not document client-supplied generated ids for create operations", () => {
  const forbiddenGeneratedIdFieldsByCommand = new Map(
    builderRuntimeOperations.flatMap((operation) => {
      const fields = [
        ...new Set(
          getRuntimeGeneratedInputPaths(operation.inputSchema).flatMap(
            (path) => {
              const field = path.filter((segment) => segment !== "*").at(-1);
              return field === undefined ? [] : [field];
            }
          )
        ),
      ];
      return fields.length === 0 ? [] : [[operation.command, fields] as const];
    })
  );
  const apiUseCases = readCliDoc("api-use-cases");

  for (const line of apiUseCases.match(/^- MCP tool: .+$/gm) ?? []) {
    const match = line.match(/^- MCP tool: ([a-z0-9._-]+) (.+)$/);
    const [, name = "", rawInput = "{}"] = match ?? [];
    const forbiddenFields = forbiddenGeneratedIdFieldsByCommand.get(name);
    if (forbiddenFields === undefined) {
      continue;
    }
    const input = JSON.parse(rawInput);
    const serializedInput = JSON.stringify(input);
    for (const field of forbiddenFields) {
      expect(serializedInput, line).not.toContain(`"${field}"`);
    }
  }
});

test("MCP capability index covers every public API operation", async () => {
  const adapter = createMetadataOnlyMcpAdapter();
  const index = await adapter.callTool({ name: "meta.index" });
  const capabilities = (
    index.structuredContent.data as {
      capabilities: { tools: string[] }[];
    }
  ).capabilities;
  const indexedTools = new Set(
    capabilities.flatMap((capability) => capability.tools)
  );
  const mcpVisibleToolNames = getMcpVisibleToolNames();

  for (const { command } of apiCommandMetadata) {
    if (mcpVisibleToolNames.has(command) === false) {
      continue;
    }
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
