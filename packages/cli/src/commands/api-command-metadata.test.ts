import { expect, test, vi } from "vitest";
import {
  apiCommandMetadata,
  cliApiCommandMetadata,
  cliCommandGroupMetadata,
  cliCommandMetadata,
  formatApiUseCaseCommand,
  getApiCommandOptions,
  highLevelApiCommands,
  highLevelCliCommands,
  mcpOnlyApiCommandMetadata,
  topLevelCliCommandMetadata,
} from "./api-command-metadata";

test("exposes command metadata", () => {
  expect(apiCommandMetadata.length).toBeGreaterThan(0);
});

test("exposes only high-level API metadata for top-level CLI registration", () => {
  expect(cliApiCommandMetadata.map((metadata) => metadata.command)).toEqual(
    highLevelApiCommands
  );
  const cliCommands = cliCommandMetadata.map((metadata) => metadata.cliCommand);
  expect(cliCommands).toEqual(
    highLevelCliCommands.map(({ command }) => command)
  );
  expect(new Set(cliCommands).size).toBe(cliCommands.length);
  expect(cliCommands).toContain("permissions");
  expect(
    cliCommands.filter((command) => command.startsWith("publish ")).length
  ).toBeGreaterThan(0);
  expect(
    cliCommands.filter((command) => command.startsWith("domains ")).length
  ).toBeGreaterThan(0);
  const mcpOnlyCommands = mcpOnlyApiCommandMetadata.map(
    ({ command }) => command
  );
  for (const command of highLevelApiCommands) {
    expect(mcpOnlyCommands).not.toContain(command);
  }
});

test("describes every grouped CLI command", () => {
  const describedGroups = new Set(
    cliCommandGroupMetadata.map(({ command }) => command)
  );
  const groupedCommands = cliCommandMetadata
    .map(({ cliCommand }) => cliCommand.split(" "))
    .filter(([, action, extra]) => action !== undefined && extra === undefined)
    .map(([group]) => group);

  for (const group of groupedCommands) {
    expect(describedGroups).toContain(group);
  }
});

test("describes root CLI commands once for help-oriented docs", () => {
  const commands = topLevelCliCommandMetadata.map(({ command }) => command);
  expect(new Set(commands).size).toBe(commands.length);
  expect(commands.at(0)).toBe("init");
  expect(commands).toEqual(
    expect.arrayContaining([
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
    ])
  );
  expect(commands).not.toEqual(
    expect.arrayContaining(["publish deploy", "domains list"])
  );
  for (const metadata of topLevelCliCommandMetadata) {
    expect(metadata.description.length).toBeGreaterThan(0);
    expect(metadata.examples.length).toBeGreaterThan(0);
  }
});

test("formats removed shell commands as MCP tools", () => {
  expect(
    formatApiUseCaseCommand("webstudio init --link <api-share-link> --json")
  ).toBe("webstudio init --link <api-share-link> --json");
  expect(formatApiUseCaseCommand("webstudio build --template ssg")).toBe(
    "webstudio build --template ssg"
  );
  expect(formatApiUseCaseCommand("webstudio permissions --json")).toBe(
    "webstudio permissions --json"
  );
  expect(formatApiUseCaseCommand("webstudio list-domains --json")).toBe(
    "webstudio domains list --json"
  );
  expect(
    formatApiUseCaseCommand("webstudio publish --target production --json")
  ).toBe("webstudio publish deploy --target production --json");
  expect(formatApiUseCaseCommand("webstudio publish --help")).toBe(
    "webstudio publish --help"
  );
  expect(
    formatApiUseCaseCommand(
      "webstudio publish deploy --target production --json"
    )
  ).toBe("webstudio publish deploy --target production --json");
  expect(formatApiUseCaseCommand("webstudio list-pages --json")).toBe(
    "MCP tool: list-pages {}"
  );
});

test("returns command-specific options when available", () => {
  const yargs = { option: vi.fn().mockReturnThis() };
  const metadata = apiCommandMetadata.find(
    (item) => item.command === "create-page"
  );

  expect(metadata).toBeDefined();
  getApiCommandOptions(metadata!)(yargs as never);

  expect(yargs.option).toHaveBeenCalledWith(
    "name",
    expect.objectContaining({ type: "string" })
  );
});

test("parses redirect status as a string option", () => {
  const yargs = { option: vi.fn().mockReturnThis() };
  const metadata = apiCommandMetadata.find(
    (item) => item.command === "create-redirect"
  );

  expect(metadata).toBeDefined();
  getApiCommandOptions(metadata!)(yargs as never);

  expect(yargs.option).toHaveBeenCalledWith(
    "status",
    expect.objectContaining({ type: "string", choices: ["301", "302"] })
  );
});

test("describes list-folders pagination and detail options", () => {
  const yargs = { option: vi.fn().mockReturnThis() };
  const metadata = apiCommandMetadata.find(
    (item) => item.command === "list-folders"
  );

  expect(metadata).toBeDefined();
  getApiCommandOptions(metadata!)(yargs as never);

  expect(yargs.option).toHaveBeenCalledWith(
    "limit",
    expect.objectContaining({ type: "number" })
  );
  expect(yargs.option).toHaveBeenCalledWith(
    "verbose",
    expect.objectContaining({ type: "boolean" })
  );
});

test("registers every catalog required option", () => {
  for (const metadata of apiCommandMetadata) {
    const registeredOptions = new Set<string>();
    const yargs = {
      option: vi.fn((name: string) => {
        registeredOptions.add(name);
        return yargs;
      }),
      example: vi.fn(() => yargs),
      version: vi.fn(() => yargs),
    };

    getApiCommandOptions(metadata)(yargs as never);

    for (const option of metadata.requiredOptions ?? ["json"]) {
      expect(registeredOptions, metadata.command).toContain(option);
    }
  }
});
