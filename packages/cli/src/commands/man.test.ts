import { afterEach, expect, test, vi } from "vitest";
import { publicApiOperations } from "@webstudio-is/protocol";
import {
  hiddenMcpOperationCommands,
  listProjectSessionMcpTools,
} from "@webstudio-is/project-build/mcp";
import {
  apiCommandMetadata,
  cliCommandMetadata,
  mcpOnlyApiCommandMetadata,
  topLevelCliCommandMetadata,
} from "./api-command-metadata";
import { man } from "./man";

afterEach(() => {
  vi.restoreAllMocks();
});

const mcpVisibleToolNames = new Set(
  listProjectSessionMcpTools(publicApiOperations).map((tool) => tool.name)
);

const visibleMcpOnlyApiCommandMetadata = mcpOnlyApiCommandMetadata.filter(
  (command) => mcpVisibleToolNames.has(command.command)
);

const readLastJsonOutput = () =>
  JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);

test("prints a bounded compact manual by default", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ json: true });

  const rawOutput = vi.mocked(console.info).mock.calls.at(-1)?.[0];
  const output = JSON.parse(rawOutput);
  expect(output).toMatchObject({
    topic: "all",
    detail: "compact",
    returnedCount: 20,
    nextCursor: "20",
  });
  expect(output.items).toHaveLength(20);
  expect(rawOutput.length).toBeLessThan(16_000);
  expect(rawOutput).not.toContain("inputSchema");
  expect(rawOutput).not.toContain("mcpArgumentExamples");
});

test("caps compact manual pages and preserves complete catalog parity", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const ids: string[] = [];
  let cursor: string | undefined;

  do {
    man({ json: true, cursor, limit: 500 });
    const output = readLastJsonOutput();
    expect(output.returnedCount).toBeLessThanOrEqual(50);
    ids.push(...output.items.map((item: { id: string }) => item.id));
    cursor = output.nextCursor;
  } while (cursor !== undefined);

  expect(ids).toEqual([
    ...topLevelCliCommandMetadata.map(({ command }) => `cli:${command}`),
    ...cliCommandMetadata.map(({ cliCommand }) => `api:${cliCommand}`),
    ...listProjectSessionMcpTools(publicApiOperations).map(
      ({ name }) => `mcp:${name}`
    ),
  ]);
  expect(new Set(ids).size).toBe(ids.length);
});

test("rejects invalid compact manual pagination", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  expect(() => man({ json: true, cursor: "not-a-cursor" })).toThrow(
    'Invalid manual cursor "not-a-cursor".'
  );
  expect(() => man({ json: true, limit: 0 })).toThrow(
    "Manual limit must be at least 1."
  );
});

test("prints the complete manual as verbose json", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ json: true, verbose: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.topic).toBe("all");
  expect(output.focusedTopics).toEqual(["api", "llm", "mcp", "content-engine"]);
  expect(output.mcp.resources).toContain("webstudio://project/components");
  expect(output).not.toHaveProperty("topics");
  expect(output.mcp).not.toHaveProperty("commands");
  expect(output.mcp).not.toHaveProperty("argumentExamples");
});

test("prints api manual as json", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "api", json: true, verbose: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.topic).toBe("api");
  expect(output.mutationNamespaces).toContain("instances");
  expect(
    output.topLevelCommands.map(({ command }: { command: string }) => command)
  ).toEqual([
    "init",
    "link",
    "sync",
    "import",
    "build",
    "preview",
    "connect",
    "screenshot",
    "permissions",
    "publish",
    "domains",
    "schema",
    "man",
    "mcp",
  ]);
  expect(
    output.topLevelCommands.map(({ command }: { command: string }) => command)
  ).not.toEqual(expect.arrayContaining(["publish deploy", "domains list"]));
  expect(Object.values(output.apiCommandsByArea).flat().sort()).toEqual(
    cliCommandMetadata.map(({ cliCommand }) => cliCommand).sort()
  );
  expect(
    output.commands.map((command: { command: string }) => command.command)
  ).toEqual(cliCommandMetadata.map(({ cliCommand }) => cliCommand));
  expect(
    output.mcpOnlyCommands.map(
      (command: { command: string }) => command.command
    )
  ).toEqual(visibleMcpOnlyApiCommandMetadata.map(({ command }) => command));
  expect(
    output.mcpOnlyCommands.map(
      (command: { command: string }) => command.command
    )
  ).not.toContain("append-instance");
  if (hiddenMcpOperationCommands.size > 0) {
    expect(
      output.mcpOnlyCommands.map(
        (command: { command: string }) => command.command
      )
    ).toEqual(
      expect.not.arrayContaining(Array.from(hiddenMcpOperationCommands))
    );
  }
  expect(output.mcpOnlyCommands).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        command: "list-pages",
        inputFields: expect.any(Array),
        requiredInputFields: expect.any(Array),
      }),
    ])
  );
  for (const command of output.mcpOnlyCommands) {
    expect(command).not.toHaveProperty("required");
  }
  expect(output.taskRecipes.pages).toContain("MCP tool: list-pages {}");
  expect(output.useCaseScenarios).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        useCase: "Update project settings",
        commands: [
          'MCP tool: update-project-settings {"meta":{"siteName":"Acme"}}',
          'MCP tool: update-project-settings {"meta":{"agentInstructions":"Use existing design tokens and keep product copy concise."}}',
        ],
      }),
    ])
  );
  const useCaseTitles = output.useCaseScenarios.map(
    ({ useCase }: { useCase: string }) => useCase
  );
  expect(new Set(useCaseTitles).size).toBe(useCaseTitles.length);
  const documentedCommands = new Set([
    ...output.commands.map(
      (command: { operation?: string; command: string }) =>
        command.operation ?? command.command
    ),
    ...output.mcpOnlyCommands.map(
      (command: { operation?: string; command: string }) =>
        command.operation ?? command.command
    ),
    ...output.useCaseScenarios
      .flatMap(({ commands }: { commands: string[] }) => commands)
      .flatMap((command: string) => {
        const match = command.match(/^webstudio ([a-z-]+)/);
        if (match !== null) {
          return [match[1]];
        }
        const mcpMatch = command.match(/^MCP tool: ([a-z0-9._-]+)/);
        return mcpMatch === null ? [] : [mcpMatch[1]];
      }),
  ]);
  const documentedVisibleCommands = new Set(
    output.useCaseScenarios
      .flatMap(({ commands }: { commands: string[] }) => commands)
      .flatMap((command: string) => {
        const match = command.match(/^webstudio ([a-z-]+)/);
        if (match !== null) {
          return [match[1]];
        }
        const mcpMatch = command.match(/^MCP tool: ([a-z0-9._-]+)/);
        return mcpMatch === null ? [] : [mcpMatch[1]];
      })
  );
  const documentedApiOperationNames = new Set([
    ...output.commands.map(
      (command: { operation?: string; command: string }) =>
        command.operation ?? command.command
    ),
    ...output.mcpOnlyCommands.map(
      (command: { operation?: string; command: string }) =>
        command.operation ?? command.command
    ),
  ]);
  if (hiddenMcpOperationCommands.size > 0) {
    expect(documentedApiOperationNames).toEqual(
      expect.not.arrayContaining(Array.from(hiddenMcpOperationCommands))
    );
  }
  for (const { command } of apiCommandMetadata) {
    if (
      documentedApiOperationNames.has(command) === false &&
      mcpVisibleToolNames.has(command) === false
    ) {
      continue;
    }
    expect(documentedCommands).toContain(command);
  }
  expect(documentedVisibleCommands).not.toContain("validate-patch");
  expect(documentedVisibleCommands).not.toContain("append-instance");
});

test("prints project-editing manual as json alias", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "project-editing", json: true, verbose: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.topic).toBe("project-editing");
  expect(output.aliasOf).toBe("llm");
});

test("prints mcp manual as json", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "mcp", json: true, verbose: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.topic).toBe("mcp");
  expect(output.resources).toContain("webstudio://project/tools");
  expect(output.mcpArgumentExamples["vision.install-ocr"]).toEqual([
    { confirm: true },
  ]);
  expect(output.mcpArgumentExamples["screenshot.diff"]).toEqual([
    {
      baselinePath: "baseline.png",
      currentPath: "current.png",
      outputDir: "visual-diff",
      threshold: 0.1,
      ignoreTopNormalizedY: 0,
      expectedText: ["Pricing", "Start free"],
      expectedVisual: {
        maxMismatchPercentage: 2,
        maxChangedRegions: 3,
        dominantColorChange: {
          channel: "luminance",
          direction: "increase",
          minMagnitude: 10,
        },
      },
    },
  ]);
  expect(output.mcpArgumentExamples["update-text"]).toEqual([
    {
      instanceId: "instance-id",
      childIndex: 0,
      text: "Launch faster",
      mode: "text",
    },
    {
      instanceId: "instance-id",
      childIndex: 0,
      text: "user.name",
      mode: "expression",
    },
  ]);
  expect(output.mcpArgumentExamples["update-props"]).toEqual([
    {
      updates: [
        {
          instanceId: "button-id",
          name: "aria-label",
          type: "string",
          value: "Open menu",
        },
        {
          instanceId: "textarea-id",
          name: "placeholder",
          type: "string",
          value: "Describe your project",
        },
      ],
    },
  ]);
  expect(output.mcpArgumentExamples["bind-props"]).toEqual([
    {
      bindings: [
        {
          instanceId: "link-id",
          name: "href",
          binding: { type: "expression", value: "currentPost.url" },
        },
      ],
    },
  ]);
});
