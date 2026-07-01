import { afterEach, expect, test, vi } from "vitest";
import { apiCommandMetadata, cliCommandMetadata } from "./api-command-metadata";
import { schema } from "./schema";

afterEach(() => {
  vi.restoreAllMocks();
});

test("prints api command schema as json", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  schema({ topic: "api", json: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.projectScope).toContain("single project");
  expect(
    output.topLevelCommands.map((command: { name: string }) => command.name)
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
      }),
      expect.objectContaining({
        name: "domains list",
        operation: "list-domains",
        method: "query",
      }),
    ])
  );
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
  expect(output.mcp.argumentExamples["update-styles"]).toEqual([
    {
      updates: [
        {
          instanceId: "instance-id",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    },
  ]);
  for (const command of output.commands) {
    expect(command).not.toHaveProperty("trpcPath");
  }
  expect(output.useCases).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        useCase: "List breakpoints",
        commands: ["MCP tool: list-breakpoints {}"],
      }),
      expect.objectContaining({
        useCase: "Create page from template",
        commands: [
          'MCP tool: create-page-from-template {"templateId":"<templateId>","name":"Landing","path":"/landing"}',
        ],
      }),
      expect.objectContaining({
        useCase: "Discover CLI/API capabilities",
        commands: expect.arrayContaining(["webstudio man mcp --json"]),
      }),
      expect.objectContaining({
        useCase: "Manage marketplace metadata",
        patchNamespaces: ["marketplaceProduct"],
      }),
    ])
  );
  expect(output.patch.namespaces).toContain("dataSources");
  expect(output.session.refreshFlag).toContain("--refresh");
  expect(output.session.resultMetadata).toContain("meta.session");
});

test("requires json output", () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);

  expect(() => schema({ topic: "api", json: false })).toThrow(
    "Handled CLI error"
  );
  expect(console.error).toHaveBeenCalledWith(
    "schema currently requires --json."
  );
});
