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
import {
  generatedAppDependencyNotes,
  getVisionVerificationLoop,
} from "../mcp-guidance";
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

test("prints the complete manual in verbose mode", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ json: false, verbose: true });

  const output = vi.mocked(console.info).mock.calls.at(-1)?.[0];
  expect(output).toContain("# Webstudio Complete CLI Manual");
  expect(output).toContain("## Top-Level Commands");
  expect(output).toContain("## MCP Capabilities");
  expect(output).toContain("webstudio://project/tools");
  expect(output).toContain("webstudio insert-fragment '<json>'");
  expect(output).toContain("webstudio mcp single-op-call insert-fragment");
  expect(output).not.toContain("## MCP Argument Examples");
  expect(output).not.toContain("### insert-component");
});

test("prints the complete manual as verbose json", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ json: true, verbose: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.topic).toBe("all");
  expect(output.focusedTopics).toEqual(["api", "llm", "mcp"]);
  expect(output.mcp.discovery).toContain("meta.index");
  expect(output.mcp.resources).toContain("webstudio://project/components");
  expect(output.mcp.capabilities).toEqual(
    expect.arrayContaining([expect.stringContaining("Instances/components")])
  );
  expect(output.mcp.boundary).toContain("webstudio insert-fragment");
  expect(output.mcp.boundary).toContain("webstudio mcp single-op-call");
  expect(output).not.toHaveProperty("topics");
  expect(output.mcp).not.toHaveProperty("commands");
  expect(output.mcp).not.toHaveProperty("argumentExamples");
});

test("prints api manual with patch workflow and examples", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "api", json: false, verbose: true });

  const output = vi.mocked(console.info).mock.calls.at(-1)?.[0];
  expect(output).toContain("webstudio permissions --json");
  expect(output).toContain("Supported namespaces");
  expect(output).toContain("## Use Case Index");
  expect(output).toContain("## CLI Capability Inventory");
  expect(output).toContain("## Known CLI Gaps");
  expect(output).toContain("Create page template");
  expect(output).toContain("MCP tool: create-page-template");
  expect(output).toContain("MCP tool: reorder-page-template");
  expect(output).toContain("Generate from design input");
  expect(output).toContain("### Top-Level Commands");
  expect(output).toContain("### High-Level API Commands By Area");
  expect(output).toContain("### MCP Tool Operations");
  expect(output).toContain("webstudio mcp");
  expect(output).toContain("## Project Session Cache");
  expect(output).toContain("Use --refresh");
  expect(output).toContain("meta.session");
  expect(output).toContain("Visually verify rendered work with AI vision");
  expect(output).toContain("MCP tool: list-breakpoints {}");
  expect(output).not.toContain("  - webstudio list-breakpoints --json");
  expect(output).toContain(
    'MCP tool: update-project-settings {"meta":{"siteName":"Acme"}}'
  );
  expect(output).toContain("Manage marketplace metadata");
  expect(output).toContain("Create records with semantic operations");
  expect(output).toContain(
    "Do not create generated records, replace generated record collections, replace records with different ids, or mutate record id fields with raw patch"
  );
  for (const { cliCommand } of cliCommandMetadata) {
    expect(output).toContain(`### ${cliCommand}`);
  }
  expect(output).not.toContain("### list-domains\n");
  expect(output).toContain("Operation: list-domains");
  expect(output).not.toContain("### update-props\n");
  expect(output).toContain("- update-props:");
  expect(output).not.toContain("append-instance");
  expect(output).not.toContain("children.json contents");
});

test("prints api manual as json", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "api", json: true, verbose: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.topic).toBe("api");
  expect(output.workflows).toContain("webstudio permissions --json");
  expect(output.workflows).toContain("webstudio mcp");
  expect(output.workflows).not.toContain(
    "webstudio snapshot --include pages,instances,props,styles,styleSources,styleSourceSelections,dataSources,resources,assets --json"
  );
  expect(output.mutationNamespaces).toContain("instances");
  expect(output.sessionBehavior.refreshFlag).toContain("--refresh");
  expect(output.sessionBehavior.metadata).toContain("meta.session");
  expect(output.knownGaps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        capability: "Generate from design input",
      }),
    ])
  );
  expect(output.knownGaps).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        capability: "Save and manage page templates",
      }),
    ])
  );
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
  expect(useCaseTitles.at(0)).toBe("Link/configure one project");
  expect(useCaseTitles.at(-1)).toBe("Cross-project maintenance");
  expect(useCaseTitles).toEqual(
    expect.arrayContaining([
      "Visually verify rendered work with AI vision",
      "Create page",
      "Insert authored JSX or one component template",
      "Create resource",
      "Upload one asset",
      "Publish project",
      "Make arbitrary store-level changes",
      "Generate from design input",
    ])
  );
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

test("prints llm manual with discovery rules", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "llm", json: false, verbose: true });

  const output = vi.mocked(console.info).mock.calls.at(-1)?.[0];
  expect(output).toContain("webstudio schema api");
  expect(output).toContain("webstudio man --json");
  expect(output).toContain("webstudio permissions --json");
  expect(output).toContain("## MCP Argument Examples");
  expect(output).not.toContain("append-instance");
  expect(output).not.toContain("children.json contents");
  expect(output).toContain('"updates"');
  expect(output).toContain('"instanceId": "instance-id"');
  expect(output).toContain("Never guess ids");
  expect(output).toContain("--refresh");
  expect(output).toContain("## LLM Implementation Process");
  expect(output).toContain("## Visual Design Workflow");
  expect(output).toContain("## Generated Files Guardrails");
  expect(output).toContain("## Values vs Bindings");
  expect(output).toContain("Use `ws:style={css\\`...\\`}`");
  expect(output).toContain("style={{ padding: 24 }}");
  expect(output).toContain("Use Webstudio prop names in JSX");
  expect(output).toContain("Do not wrap the CLI call in `pwd && ...`");
  expect(output).toContain("`node packages/cli/local.js ...`");
  expect(output).toContain(
    "Do not take a broad task such as creating a full design-system page as one execution unit"
  );
  expect(output).toContain('workflow.next {"goal":"design-system-page"}');
  expect(output).toContain("one dry-run JSX section");
  expect(output).toContain("components.coverage-insert-next");
  expect(output).toContain("Phase commands do not include nextPhase");
  expect(output).toContain("`className` or `htmlFor`");
  expect(output).toContain(
    "<radix.Switch><radix.SwitchThumb /></radix.Switch>"
  );
  expect(output).toContain("Use `insert-component` when you want");
  expect(output).toContain("Do not pass `detail` to `list-pages`");
  expect(output).toContain("components.coverage-plan");
  expect(output).toContain(
    "Use `bind-props` only when the prop must stay dynamic"
  );
  expect(output).toContain(
    '{"pageId":"page-id","values":{"title":"Pricing | Acme","meta":{"description":"Plans for teams"}}}'
  );
  expect(output).toContain(
    '{"resourceId":"resource-id","values":{"url":"https://api.example.com/items"}}'
  );
  expect(output).toContain(
    "Make edits through Webstudio semantic commands/MCP tools"
  );
  expect(output).toContain(
    "Do not edit `app/__generated__`, generated route files"
  );
  expect(output).toContain("inspect it with vision");
  expect(output).toContain(
    "Pass --json only to commands whose help/schema documents it"
  );
  expect(output).toContain("## Known Gaps");
  expect(output).toContain("Provider-specific authenticated pages");
});

test("prints project-editing manual as llm alias", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "project-editing", json: false, verbose: true });

  const output = vi.mocked(console.info).mock.calls.at(-1)?.[0];
  expect(output).toContain("## LLM Implementation Process");
  expect(output).toContain('workflow.next {"goal":"design-system-page"}');
  expect(output).toContain("Use `ws:style={css\\`...\\`}`");
});

test("prints project-editing manual as json alias", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "project-editing", json: true, verbose: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.topic).toBe("project-editing");
  expect(output.aliasOf).toBe("llm");
  expect(output.implementationProcess).toEqual(
    expect.arrayContaining([
      expect.stringContaining("webstudio man --json"),
      expect.stringContaining("inspect it with vision"),
    ])
  );
});

test("prints llm manual as json with implementation process", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "llm", json: true, verbose: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.topic).toBe("llm");
  expect(output.implementationProcess).toEqual(
    expect.arrayContaining([
      expect.stringContaining("webstudio man --json"),
      expect.stringContaining("inspect it with vision"),
    ])
  );
  expect(output.visualDesignWorkflow).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Read editable Webstudio structure first"),
      expect.stringContaining(
        "Make edits through Webstudio semantic commands/MCP tools"
      ),
    ])
  );
  expect(output.responsiveVerification).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Read breakpoints with list-breakpoints"),
      expect.stringContaining("viewport"),
      expect.stringContaining("Inspect every viewport screenshot with vision"),
    ])
  );
  expect(output.generatedFileGuardrails).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Do not edit app/__generated__"),
      expect.stringContaining("Generated files are build artifacts"),
    ])
  );
  expect(output.valuesVsBindings).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Use direct value tools for fixed content"),
      expect.stringContaining(
        "Use bind-props only when the prop must stay dynamic"
      ),
      expect.stringContaining("Page metadata fields"),
    ])
  );
  expect(output.rules).toContain(
    "Pass --json only to commands whose help/schema documents it. Do not add --json to top-level commands such as sync unless supported."
  );
  expect(output.rules).toContain(
    "For visual/design work, verify the rendered result with vision before finishing."
  );
  expect(output.rules).toContain(
    "Use direct values for static strings and bindings only for dynamic expressions/resources/actions."
  );
  expect(output.rules).toContain(
    "Use plain fixed text where documented. Only encode a quoted JavaScript string literal when a field is explicitly documented as an expression-only value."
  );
  expect(output.visionVerificationLoop).toContain(
    getVisionVerificationLoop({ includeDiff: true })[1]
  );
  expect(output.visionVerificationLoop).toEqual(
    expect.arrayContaining([
      expect.stringContaining("list-breakpoints"),
      expect.stringContaining("viewport"),
    ])
  );
  expect(output.screenshotVerification).toContain("screenshot.diff");
  expect(output.screenshotVerification).toContain("list-breakpoints");
});

test("prints mcp manual with startup and JSON argument examples", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "mcp", json: false, verbose: true });

  const output = vi.mocked(console.info).mock.calls.at(-1)?.[0];
  expect(output).toContain("# Webstudio MCP Manual");
  expect(output).toContain("stdout is reserved for MCP JSON-RPC");
  expect(output).toContain("meta.get_more_tools");
  expect(output).toContain("webstudio://project/tools");
  expect(output).toContain("## MCP SDK Client Imports");
  expect(output).toContain(
    'import { Client } from "@modelcontextprotocol/sdk/client/index.js";'
  );
  expect(output).toContain(
    'import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";'
  );
  expect(output).toContain(
    'import { LoggingMessageNotificationSchema } from "@modelcontextprotocol/sdk/types.js";'
  );
  expect(output).toContain('args: ["packages/cli/local.js", "mcp"]');
  expect(output).toContain("Use `node packages/cli/local.js mcp`");
  expect(output).toContain("## Vision Verification Loop");
  expect(output).toContain("screenshot.diff");
  expect(output).toContain("Read screenshot.diff textAnalysis");
  expect(output).toContain("vision.install-ocr");
  expect(output).toContain('"parentInstanceId": "parent-id"');
  expect(output).toContain(
    "Copying a `.webstudio` folder is not an isolated project clone"
  );
  expect(output).toContain("Use `--dry-run` with local-capable mutation tools");
});

test("prints mcp manual as json", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "mcp", json: true, verbose: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.topic).toBe("mcp");
  expect(output.discovery).toContain("meta.index");
  expect(output.resources).toContain("webstudio://project/tools");
  expect(output.rules).toContain(
    "For visual/design work, verify the rendered result with vision before finishing."
  );
  expect(output.visionVerificationLoop).toContain(
    getVisionVerificationLoop({ includeDiff: true })[1]
  );
  expect(output.visionVerificationLoop).toContain(
    generatedAppDependencyNotes[0]
  );
  expect(output.visionVerificationLoop).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        'Call screenshot with { path: "/" } or the changed page path and viewport'
      ),
      expect.stringContaining("list-breakpoints"),
      expect.stringContaining("viewport"),
    ])
  );
  expect(output.visionVerificationLoop).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        "Add expectedText when a specific visible phrase must be present"
      ),
    ])
  );
  expect(output.screenshotVerification).toContain("screenshot.diff");
  expect(output.screenshotVerification).toContain("OCR textAnalysis");
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

test("prints available topics for unknown manual topic", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "missing", json: false });

  expect(vi.mocked(console.info).mock.calls.at(-1)?.[0]).toContain(
    "Available topics"
  );
  expect(vi.mocked(console.info).mock.calls.at(-1)?.[0]).toContain("- all");
  expect(vi.mocked(console.info).mock.calls.at(-1)?.[0]).toContain("- mcp");
});
