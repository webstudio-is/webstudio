import { afterEach, expect, test, vi } from "vitest";
import { apiCommandMetadata } from "./api-command-metadata";
import { man } from "./man";

afterEach(() => {
  vi.restoreAllMocks();
});

test("prints api manual with patch workflow and examples", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "api", json: false });

  const output = vi.mocked(console.info).mock.calls.at(-1)?.[0];
  expect(output).toContain("webstudio permissions --json");
  expect(output).toContain("webstudio inspect --json");
  expect(output).toContain("webstudio apply-patch --base-version");
  expect(output).toContain("Supported namespaces");
  expect(output).toContain("## Use Case Index");
  expect(output).toContain("Manage breakpoints");
  expect(output).toContain("Manage marketplace metadata");
  expect(output).toContain("Create a design token");
  for (const { command } of apiCommandMetadata) {
    expect(output).toContain(`### ${command}`);
  }
});

test("prints api manual as json", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "api", json: true });

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output.topic).toBe("api");
  expect(output.workflows).toContain(
    "webstudio validate-patch --base-version <version> --input patch.json --json"
  );
  expect(output.workflows).toContain("webstudio permissions --json");
  expect(output.workflows).toContain(
    "webstudio snapshot --include pages,instances,props,styles,styleSources,styleSourceSelections,resources,variables,assets --json"
  );
  expect(output.workflows).not.toContain(
    "webstudio snapshot --include pages,instances,props,styles,styleSources,styleSourceSelections,dataSources,resources,assets --json"
  );
  expect(output.mutationNamespaces).toContain("instances");
  expect(
    output.commands.map((command: { command: string }) => command.command)
  ).toEqual(apiCommandMetadata.map(({ command }) => command));
  expect(output.taskRecipes.pages).toContain(
    "webstudio list-pages --include-folders --json"
  );
  expect(output.inputFileShapes["children.json"]).toEqual([
    { tag: "div", label: "Hero", text: "Launch faster" },
  ]);
  expect(
    output.useCaseScenarios.map(({ useCase }: { useCase: string }) => useCase)
  ).toEqual([
    "Link/configure one project",
    "Identify current token",
    "Check token permissions",
    "Inspect project/build/version",
    "Discover CLI/API capabilities",
    "List pages",
    "Read page by id",
    "Read page by path",
    "Create page",
    "Update page settings/metadata",
    "Duplicate page",
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
    "Manage site-level settings not covered by semantic commands",
    "Manage breakpoints",
    "Manage marketplace metadata",
  ]);
  const documentedCommands = new Set(
    output.useCaseScenarios
      .flatMap(({ commands }: { commands: string[] }) => commands)
      .flatMap((command: string) => {
        const match = command.match(/^webstudio ([a-z-]+)/);
        return match === null ? [] : [match[1]];
      })
  );
  for (const { command } of apiCommandMetadata) {
    expect(documentedCommands).toContain(command);
  }
  expect(documentedCommands).toContain("validate-patch");
});

test("prints llm manual with discovery rules", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "llm", json: false });

  const output = vi.mocked(console.info).mock.calls.at(-1)?.[0];
  expect(output).toContain("webstudio schema api --json");
  expect(output).toContain("webstudio permissions --json");
  expect(output).toContain("Never guess ids");
});

test("prints available topics for unknown manual topic", () => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  man({ topic: "missing", json: false });

  expect(vi.mocked(console.info).mock.calls.at(-1)?.[0]).toContain(
    "Available topics"
  );
});
