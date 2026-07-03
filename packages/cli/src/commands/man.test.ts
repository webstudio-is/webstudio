import { afterEach, expect, test, vi } from "vitest";
import {
  apiCommandMetadata,
  cliCommandMetadata,
  mcpOnlyApiCommandMetadata,
} from "./api-command-metadata";
import {
  generatedAppDependencyNotes,
  getVisionVerificationLoop,
} from "../mcp-guidance";
import { man } from "./man";

afterEach(() => {
  vi.restoreAllMocks();
});

test("prints api manual with patch workflow and examples", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "api", json: false });

  const output = vi.mocked(console.info).mock.calls.at(-1)?.[0];
  expect(output).toContain("webstudio permissions --json");
  expect(output).toContain("Supported namespaces");
  expect(output).toContain("## Use Case Index");
  expect(output).toContain("## CLI Capability Inventory");
  expect(output).toContain("## Known CLI Gaps");
  expect(output).toContain("Save and manage page templates");
  expect(output).toContain("Generate from design input");
  expect(output).toContain("### Top-Level Commands");
  expect(output).toContain("### High-Level API Commands By Area");
  expect(output).toContain("### MCP-Only Operations");
  expect(output).toContain("webstudio mcp");
  expect(output).toContain("## Project Session Cache");
  expect(output).toContain("Use --refresh");
  expect(output).toContain("meta.session");
  expect(output).toContain("Visually verify rendered work with AI vision");
  expect(output).toContain("MCP tool: list-breakpoints {}");
  expect(output).not.toContain("  - webstudio list-breakpoints --json");
  expect(output).toContain(
    'MCP tool: update-project-settings {"settings":"project-settings.json contents"}'
  );
  expect(output).toContain("Manage marketplace metadata");
  expect(output).toContain("Create a design token");
  for (const { cliCommand } of cliCommandMetadata) {
    expect(output).toContain(`### ${cliCommand}`);
  }
  expect(output).not.toContain("### list-domains\n");
  expect(output).toContain("Operation: list-domains");
  expect(output).not.toContain("### update-props\n");
  expect(output).toContain("- update-props:");
});

test("prints api manual as json", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "api", json: true });

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
        capability: "Save and manage page templates",
      }),
      expect.objectContaining({
        capability: "Generate from design input",
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
  ).toEqual(mcpOnlyApiCommandMetadata.map(({ command }) => command));
  expect(output.taskRecipes.pages).toContain(
    'MCP tool: list-pages {"includeFolders":true}'
  );
  expect(output.useCaseScenarios).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        useCase: "Update project settings",
        commands: [
          'MCP tool: update-project-settings {"settings":"project-settings.json contents"}',
        ],
      }),
    ])
  );
  expect(output.inputFileShapes["children.json"]).toEqual([
    { tag: "div", label: "Hero", text: "Launch faster" },
  ]);
  expect(
    output.useCaseScenarios.map(({ useCase }: { useCase: string }) => useCase)
  ).toEqual([
    "Link/configure one project",
    "Import synced project bundle into another project",
    "Identify current token",
    "Check token permissions",
    "Inspect project/build/version",
    "Discover CLI/API capabilities",
    "Inspect and refresh MCP session cache",
    "Visually verify rendered work with AI vision",
    "List pages",
    "Read page by id",
    "Read page by path",
    "Create page",
    "Update page settings/metadata",
    "Read project settings",
    "Update project settings",
    "List redirects",
    "Create redirect",
    "Update redirect",
    "Delete redirect",
    "List breakpoints",
    "Create breakpoint",
    "Update breakpoint",
    "Delete breakpoint",
    "Duplicate page",
    "List page templates",
    "Create page from template",
    "Delete page",
    "List folders",
    "Create folder",
    "Update folder",
    "Delete folder",
    "List element instances",
    "Inspect one element instance",
    "Append/prepend/replace child elements",
    "Move elements",
    "Clone element subtree",
    "Delete element subtree",
    "List text/expression children",
    "Update text child",
    "Update props",
    "Delete props",
    "Bind props to expressions/resources/actions",
    "Read styles",
    "Update local styles",
    "Delete local styles",
    "Replace matching style values",
    "List design tokens",
    "Create design tokens",
    "Update design token styles",
    "Delete design token styles",
    "Attach design token to instances",
    "Detach design token from instances",
    "Extract design token from local styles",
    "List CSS variables",
    "Define CSS variables",
    "Delete CSS variables",
    "Rewrite CSS variable references",
    "List data variables",
    "Create data variable",
    "Update data variable",
    "Delete data variable",
    "List resources",
    "Create resource",
    "Update resource",
    "Delete resource",
    "List assets",
    "Upload one asset",
    "Upload asset batch",
    "Find asset usage",
    "Replace asset references",
    "Delete assets",
    "Publish project",
    "List publishes",
    "Check publish job",
    "Unpublish",
    "List domains",
    "Create domain",
    "Update domain",
    "Delete domain",
    "Verify domain",
    "Make arbitrary store-level changes",
    "Manage marketplace metadata",
    "Search and inspect safely",
    "Refactor targeted content",
    "Optimize existing project",
    "Connect external data",
    "Support dynamic runtime behavior",
    "Build authenticated pages",
    "Generate from design input",
    "Cross-project maintenance",
  ]);
  const documentedCommands = new Set([
    ...output.commands.map(
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
        const mcpMatch = command.match(/^MCP tool: ([a-z-]+)/);
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
        const mcpMatch = command.match(/^MCP tool: ([a-z-]+)/);
        return mcpMatch === null ? [] : [mcpMatch[1]];
      })
  );
  for (const { command } of apiCommandMetadata) {
    expect(documentedCommands).toContain(command);
  }
  expect(documentedVisibleCommands).not.toContain("validate-patch");
});

test("prints llm manual with discovery rules", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "llm", json: false });

  const output = vi.mocked(console.info).mock.calls.at(-1)?.[0];
  expect(output).toContain("webstudio schema api --json");
  expect(output).toContain("webstudio permissions --json");
  expect(output).toContain("## MCP Argument Examples");
  expect(output).toContain('"updates"');
  expect(output).toContain('"instanceId": "instance-id"');
  expect(output).toContain("Never guess ids");
  expect(output).toContain("--refresh");
  expect(output).toContain("## LLM Implementation Process");
  expect(output).toContain("## Visual Design Workflow");
  expect(output).toContain("## Generated Files Guardrails");
  expect(output).toContain("## Values vs Bindings");
  expect(output).toContain(
    "Use `bind-props` only when the prop must stay dynamic"
  );
  expect(output).toContain('"\\"Pricing | Acme\\""');
  expect(output).toContain(
    '{"pageId":"page-id","values":{"title":"\\"Pricing | Acme\\"","meta":{"description":"\\"Plans for teams\\""}}}'
  );
  expect(output).toContain(
    '{"resourceId":"resource-id","values":{"url":"\\"https://api.example.com/items\\""}}'
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

test("prints llm manual as json with implementation process", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "llm", json: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.topic).toBe("llm");
  expect(output.implementationProcess).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Discover capabilities"),
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
    "For expression-backed fields that need fixed text, encode the fixed text as a quoted JavaScript string literal expression."
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

  man({ topic: "mcp", json: false });

  const output = vi.mocked(console.info).mock.calls.at(-1)?.[0];
  expect(output).toContain("# Webstudio MCP Manual");
  expect(output).toContain("stdout is reserved for MCP JSON-RPC");
  expect(output).toContain("meta.get_more_tools");
  expect(output).toContain("webstudio://project/tools");
  expect(output).toContain("## Vision Verification Loop");
  expect(output).toContain("screenshot.diff");
  expect(output).toContain("Read screenshot.diff textAnalysis");
  expect(output).toContain("vision.install-ocr");
  expect(output).toContain('"parentInstanceId": "parent-id"');
});

test("prints mcp manual as json", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "mcp", json: true });

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
  expect(output.visionVerificationLoop).toContain(
    "When a baseline PNG exists, call screenshot.diff with baselinePath, currentPath, and outputDir."
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
    },
  ]);
  expect(output.mcpArgumentExamples["update-text"]).toEqual([
    {
      instanceId: "instance-id",
      childIndex: 0,
      text: "Launch faster",
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
  expect(vi.mocked(console.info).mock.calls.at(-1)?.[0]).toContain("- mcp");
});
