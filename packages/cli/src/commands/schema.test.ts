import { afterEach, expect, test, vi } from "vitest";
import {
  apiCommandMetadata,
  cliCommandMetadata,
  topLevelCliCommandMetadata,
} from "./api-command-metadata";
import {
  listProjectSessionMcpResources,
  listProjectSessionMcpTools,
} from "@webstudio-is/project-build/mcp";
import { publicApiOperations } from "@webstudio-is/protocol";
import { schema } from "./schema";

afterEach(() => {
  vi.restoreAllMocks();
});

test("prints api command schema as json", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  schema({ topic: "api", json: true, verbose: true, limit: 200 });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.projectScope).toContain("single project");
  expect(
    output.topLevelCommands.map((command: { name: string }) => command.name)
  ).toEqual(topLevelCliCommandMetadata.map(({ command }) => command));
  expect(
    output.topLevelCommands.map((command: { name: string }) => command.name)
  ).not.toEqual(expect.arrayContaining(["publish deploy", "domains list"]));
  expect(output.commandGroups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "publish",
        commands: expect.arrayContaining([
          expect.objectContaining({ name: "publish deploy" }),
        ]),
      }),
      expect.objectContaining({
        name: "domains",
        commands: expect.arrayContaining([
          expect.objectContaining({ name: "domains list" }),
        ]),
      }),
    ])
  );
  expect(
    output.commands.map((command: { name: string }) => command.name)
  ).toEqual(cliCommandMetadata.map((metadata) => metadata.cliCommand));
  expect(output.commands).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "permissions", method: "query" }),
      expect.objectContaining({
        name: "publish deploy",
        operation: "publish",
        method: "mutation",
        inputSchema: expect.objectContaining({
          type: "object",
          properties: expect.objectContaining({
            target: expect.objectContaining({
              enum: expect.arrayContaining(["staging", "production"]),
            }),
            domains: expect.objectContaining({ type: "array" }),
            message: expect.objectContaining({ type: "string" }),
          }),
        }),
      }),
      expect.objectContaining({
        name: "domains list",
        operation: "list-domains",
        method: "query",
      }),
    ])
  );
  for (const command of output.commands) {
    expect(command.inputSchema).toEqual(
      expect.objectContaining({ type: "object" })
    );
  }
  expect(output.commands).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "apply-patch" }),
      expect.objectContaining({ name: "list-assets" }),
      expect.objectContaining({ name: "create-page-from-template" }),
    ])
  );
  expect(output.mcp.toolCount).toBe(apiCommandMetadata.length);
  expect(output.mcp.discovery).toContain("meta.get_more_tools");
  expect(output.mcp.resources).toContain("webstudio://project/tools");
  expect(output.mcp.resources).toContain("webstudio://project/components");
  expect(output.mcp.capabilities).toEqual(
    expect.arrayContaining([expect.stringContaining("Instances/components")])
  );
  expect(output.mcp.boundary).toContain("MCP-level");
  expect(output.mcp).not.toHaveProperty("commands");
  expect(output.mcp).not.toHaveProperty("argumentExamples");
  for (const command of output.commands) {
    expect(command).not.toHaveProperty("trpcPath");
  }
  expect(output.useCases).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        useCase: "Check token permissions",
        commands: ["webstudio permissions --json"],
      }),
      expect.objectContaining({
        useCase: "Publish project",
        commands: ["webstudio publish deploy --target production --json"],
      }),
    ])
  );
  expect(output.useCases).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ useCase: "List breakpoints" }),
      expect.objectContaining({ useCase: "Create page from template" }),
    ])
  );
  expect(output.patch.namespaces).toContain("dataSources");
  expect(output.session.refreshFlag).toContain("--refresh");
  expect(output.session.resultMetadata).toContain("meta.session");
});

test("prints api command schema as json by default", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  schema({ topic: "api", json: false });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.name).toBe("webstudio-cli");
  expect(output.detail).toBe("compact");
  expect(output).not.toHaveProperty("commandGroups");
});

test("prints compact mcp tool summaries as json by default", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  schema({ topic: "mcp", json: true, limit: 200 });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  const expectedTools = listProjectSessionMcpTools(publicApiOperations, {
    includeImport: true,
    includeScreenshot: true,
    includeScreenshotDiff: true,
    includeInstallOcr: true,
    includePreview: true,
  });

  expect(output.name).toBe("webstudio-mcp");
  expect(output.detail).toBe("compact");
  expect(output).not.toHaveProperty("callCommand");
  expect(output.singleOpCallCommand).toContain("webstudio mcp single-op-call");
  expect(output.usage).toContain("--verbose");
  expect(output.discovery).toContain(
    `webstudio mcp single-op-call meta.get_more_tools '{"tools":["insert-fragment"]}'`
  );
  expect(output.discovery).toEqual(
    expect.arrayContaining([
      "webstudio mcp single-op-call meta.index",
      expect.stringContaining("components.coverage-plan"),
    ])
  );
  expect(output.resources).toEqual(listProjectSessionMcpResources());
  expect(output.toolCount).toBe(expectedTools.length);
  expect(output.tools).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "meta.index",
        requiredInputFields: [],
      }),
      expect.objectContaining({
        name: "insert-fragment",
        operationId: "instances.insertFragment",
        method: "mutation",
      }),
      expect.objectContaining({
        name: "screenshot.diff",
        examples: expect.arrayContaining([
          expect.objectContaining({ baselinePath: "baseline.png" }),
        ]),
      }),
    ])
  );
  expect(output.tools).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "append-instance",
      }),
    ])
  );
  expect(output.tools).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        inputSchema: expect.any(Object),
      }),
      expect.objectContaining({
        annotations: expect.any(Object),
      }),
    ])
  );
});

test("prints full mcp tool input schemas when requested", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  schema({ topic: "mcp", json: true, verbose: true, limit: 200 });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);

  expect(output.detail).toBe("verbose");
  expect(output.tools).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "meta.index",
        inputSchema: expect.objectContaining({ type: "object" }),
      }),
      expect.objectContaining({
        name: "insert-component",
        inputSchema: expect.objectContaining({
          type: "object",
        }),
      }),
    ])
  );
  const insertFragmentTool = output.tools.find(
    (tool: { name: string }) => tool.name === "insert-fragment"
  );
  expect(insertFragmentTool.inputSchema.required).toEqual([
    "parentInstanceId",
    "fragment",
  ]);
  expect(Object.keys(insertFragmentTool.inputSchema.properties)).toEqual([
    "parentInstanceId",
    "fragment",
    "mode",
    "insertIndex",
  ]);
  const fragmentSchema = insertFragmentTool.inputSchema.properties.fragment;
  expect(fragmentSchema.type).toBe("string");
  const jsxDescription = fragmentSchema.description;
  expect(jsxDescription).toContain("not React aliases className or htmlFor");
  expect(jsxDescription).toContain("Use ws:style");
  expect(jsxDescription).toContain("style={{ padding: 24 }}");
  expect(jsxDescription).toContain("include required child/part components");
  expect(jsxDescription).toContain("same parent structure");
  expect(jsxDescription).toContain("use insert-component");
  expect(insertFragmentTool.inputSchema.properties).not.toHaveProperty(
    "source"
  );
});

test("compact schema discovery is materially smaller but remains actionable", () => {
  const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

  schema({ topic: "mcp", json: true, limit: 200 });
  const compactText = String(info.mock.calls.at(-1)?.[0]);
  const compact = JSON.parse(compactText);
  schema({ topic: "mcp", json: true, verbose: true, limit: 200 });
  const verboseText = String(info.mock.calls.at(-1)?.[0]);
  const verbose = JSON.parse(verboseText);

  expect(compact.toolCount).toBe(verbose.toolCount);
  expect(compact.tools).toHaveLength(verbose.tools.length);
  expect(compact.tools).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "insert-fragment",
        method: "mutation",
        requiredInputFields: ["parentInstanceId", "fragment"],
      }),
    ])
  );
  expect(compactText).not.toContain("/packages/");
  expect(compactText.length).toBeLessThan(verboseText.length * 0.5);
});

test("paginates compact and verbose schema discovery over the same tools", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  schema({ topic: "mcp", json: true, limit: 2 });
  const compact = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  schema({ topic: "mcp", json: true, verbose: true, limit: 2 });
  const verbose = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  schema({
    topic: "mcp",
    json: true,
    verbose: true,
    cursor: verbose.nextCursor,
    limit: 2,
  });
  const nextPage = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);

  expect(compact).toMatchObject({
    detail: "compact",
    returnedCount: 2,
    nextCursor: "2",
  });
  expect(verbose).toMatchObject({
    detail: "verbose",
    returnedCount: 2,
    nextCursor: "2",
  });
  expect(verbose.tools.map(({ name }: { name: string }) => name)).toEqual(
    compact.tools.map(({ name }: { name: string }) => name)
  );
  expect(nextPage.tools.map(({ name }: { name: string }) => name)).not.toEqual(
    verbose.tools.map(({ name }: { name: string }) => name)
  );
});

test("prints focused mcp tool schema with tool option", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  schema({ topic: "mcp", json: true, tool: "insert-fragment" });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);

  expect(output.detail).toBe("verbose");
  expect(output.focusedToolNames).toEqual(["insert-fragment"]);
  expect(output.toolCount).toBe(1);
  expect(output.tools).toEqual([
    expect.objectContaining({
      name: "insert-fragment",
      inputSchema: expect.objectContaining({ type: "object" }),
    }),
  ]);
});

test("prints focused mcp tool schema when topic is a tool name", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  schema({ topic: "insert-fragment", json: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);

  expect(output.detail).toBe("verbose");
  expect(output.focusedToolNames).toEqual(["insert-fragment"]);
  expect(output.tools).toEqual([
    expect.objectContaining({
      name: "insert-fragment",
      inputSchema: expect.objectContaining({
        required: ["parentInstanceId", "fragment"],
      }),
    }),
  ]);
});

test("prints mcp tool overview as json without json flag", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  schema({ topic: "mcp", json: false });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.name).toBe("webstudio-mcp");
  expect(output.detail).toBe("compact");
});

test("reports unknown schema topics with available topics", () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);

  expect(() => schema({ topic: "widgets", json: true })).toThrow(
    "Handled CLI error"
  );
  expect(console.error).toHaveBeenCalledWith(
    'Unknown MCP tool "widgets". Use webstudio schema mcp for tool names, or webstudio meta.get_more_tools \'{"tools":["insert-fragment"]}\' for focused discovery.'
  );
});
