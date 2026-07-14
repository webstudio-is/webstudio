import { readFile } from "node:fs/promises";
import { describe, expect, test, vi } from "vitest";
import makeCLI from "yargs";
import {
  apiCommandMetadata,
  cliCommandMetadata,
} from "./commands/api-command-metadata";
import {
  getTopLevelMcpToolForwardArgs,
  getTopLevelMcpToolHint,
  handleOutputStreamError,
  registerCommands,
  rootCliEpilogue,
} from "./cli";
import type { CommonYargsArgv } from "./commands/yargs-types";

type CommandBuilder = (yargs: CommonYargsArgv) => CommonYargsArgv;

const createYargs = () => {
  const commands: { command: string; builder?: CommandBuilder }[] = [];
  const yargs = {
    command: vi.fn(
      (
        command: string | string[],
        _description?: string,
        builder?: unknown
      ) => {
        commands.push({
          command: Array.isArray(command) ? (command[0] ?? "") : command,
          builder:
            typeof builder === "function"
              ? (builder as CommandBuilder)
              : undefined,
        });
        return yargs;
      }
    ),
    demandCommand: vi.fn(() => yargs),
    option: vi.fn(() => yargs),
    example: vi.fn(() => yargs),
    version: vi.fn(() => yargs),
  };
  return { yargs: yargs as unknown as CommonYargsArgv, commands };
};

const runGroupBuilder = (
  commands: { command: string; builder?: CommandBuilder }[],
  group: string
) => {
  const groupCommand = commands.find((command) => command.command === group);
  expect(groupCommand?.builder).toBeDefined();
  const childCommands: string[] = [];
  const childYargs = {
    command: vi.fn((command: string | string[]) => {
      childCommands.push(Array.isArray(command) ? (command[0] ?? "") : command);
      return childYargs;
    }),
    demandCommand: vi.fn(() => childYargs),
    option: vi.fn(() => childYargs),
    example: vi.fn(() => childYargs),
    version: vi.fn(() => childYargs),
  };

  groupCommand?.builder?.(childYargs as unknown as CommonYargsArgv);

  return {
    childCommands,
    demandCommand: childYargs.demandCommand,
  };
};

const commandNames = (commands: { command: string }[]) =>
  commands.map((command) => command.command);

const getExpectedGroupActions = (group: string) =>
  cliCommandMetadata
    .map(({ cliCommand }) => cliCommand.split(" "))
    .filter(([commandGroup, action, extra]) => {
      return (
        commandGroup === group && action !== undefined && extra === undefined
      );
    })
    .map(([, action]) => action);

const getHelpOutput = async (args: string[]) => {
  let output = "";
  const yargs = makeCLI(args)
    .scriptName("webstudio")
    .exitProcess(false)
    .wrap(null)
    .epilogue(rootCliEpilogue)
    .fail((message, error) => {
      throw error ?? new Error(message);
    });

  registerCommands(yargs as unknown as CommonYargsArgv);
  await yargs.parseAsync(args, {}, (_error, _argv, helpOutput) => {
    output = helpOutput;
  });
  return output;
};

describe("registerCommands", () => {
  test("exits successfully on broken pipe output errors", () => {
    const exitProcess = vi.fn((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as never;
    const error = Object.assign(new Error("write EPIPE"), { code: "EPIPE" });

    expect(() => handleOutputStreamError(error, exitProcess)).toThrow("exit 0");

    expect(exitProcess).toHaveBeenCalledWith(0);
  });

  test("rethrows non broken pipe output errors", () => {
    const exitProcess = vi.fn() as never;
    const error = Object.assign(new Error("write failed"), { code: "EIO" });

    expect(() => handleOutputStreamError(error, exitProcess)).toThrow(error);

    expect(exitProcess).not.toHaveBeenCalled();
  });

  test("forwards top-level mcp tool shortcuts to single-op-call", () => {
    expect(getTopLevelMcpToolForwardArgs(["meta.index"])).toEqual([
      "mcp",
      "single-op-call",
      "meta.index",
    ]);
    expect(
      getTopLevelMcpToolForwardArgs([
        "insert-fragment",
        '{"parentInstanceId":"parent-id","fragment":"<$.Box />"}',
        "--dry-run",
      ])
    ).toEqual([
      "mcp",
      "single-op-call",
      "insert-fragment",
      '{"parentInstanceId":"parent-id","fragment":"<$.Box />"}',
      "--dry-run",
    ]);
    expect(
      getTopLevelMcpToolForwardArgs([
        "workflow.next",
        "goal",
        "design-system-page",
      ])
    ).toEqual([
      "mcp",
      "single-op-call",
      "workflow.next",
      '{"goal":"design-system-page"}',
    ]);
    expect(
      getTopLevelMcpToolForwardArgs([
        "workflow.next",
        "goal-design-system-page",
      ])
    ).toEqual([
      "mcp",
      "single-op-call",
      "workflow.next",
      '{"goal":"design-system-page"}',
    ]);
    expect(getTopLevelMcpToolForwardArgs(["permissions"])).toBeUndefined();
    expect(getTopLevelMcpToolForwardArgs(["audit"])).toBeUndefined();
    for (const command of [
      "get-marketplace-product",
      "update-marketplace-product",
      "set-redirects",
    ]) {
      expect(
        getTopLevelMcpToolForwardArgs([command, "--help"])
      ).toBeUndefined();
    }
    expect(getTopLevelMcpToolForwardArgs(["unknown-command"])).toBeUndefined();
  });

  test.each([
    "get-marketplace-product",
    "update-marketplace-product",
    "set-redirects",
  ])("shows registered top-level help for %s", async (command) => {
    const output = await getHelpOutput([command, "--help"]);

    expect(output).toContain(`webstudio ${command}`);
    expect(output).not.toContain("single-op-call <tool>");
  });

  test("forwards screenshot JSON input without treating it as a URL", () => {
    expect(
      getTopLevelMcpToolForwardArgs([
        "screenshot",
        '{"path":"/pricing","viewport":{"width":1440,"height":900}}',
      ])
    ).toEqual([
      "mcp",
      "single-op-call",
      "screenshot",
      '{"path":"/pricing","viewport":{"width":1440,"height":900}}',
    ]);
    expect(
      getTopLevelMcpToolForwardArgs(["screenshot", "https://example.com"])
    ).toBeUndefined();
  });

  test("suggests mcp single-op-call for top-level dotted tool names", () => {
    expect(getTopLevelMcpToolHint(["meta.index"])).toContain(
      "webstudio meta.index"
    );
    expect(getTopLevelMcpToolHint(["meta.index"])).toContain(
      "webstudio mcp single-op-call meta.index"
    );
    expect(getTopLevelMcpToolHint(["meta.index"])).toContain(
      "node packages/cli/local.js meta.index"
    );
    expect(getTopLevelMcpToolHint(["meta.index"])).toContain(
      "node packages/cli/local.js mcp single-op-call meta.index"
    );
    expect(getTopLevelMcpToolHint(["insert-fragment"])).toContain(
      "webstudio mcp single-op-call insert-fragment"
    );
    expect(getTopLevelMcpToolHint(["permissions"])).toBeUndefined();
    expect(getTopLevelMcpToolHint(["unknown-command"])).toBeUndefined();
  });

  test("root help points low-context agents to mcp meta.index first", async () => {
    const output = await getHelpOutput(["--help"]);

    expect(output).toContain("Project editing / LLM quick start");
    expect(output).toContain("webstudio man project-editing");
    expect(output).toContain("webstudio meta.index");
    expect(output).toContain("webstudio insert-fragment");
    expect(output).toContain("webstudio mcp single-op-call meta.index");
    expect(output).toContain(
      "webstudio mcp single-op-call meta.get_more_tools"
    );
    expect(output).toContain("insert-fragment");
    expect(output).toContain("node packages/cli/local.js");
  });

  test("registers high-level API commands and mcp command", () => {
    const { yargs, commands } = createYargs();

    registerCommands(yargs);

    expect(commandNames(commands)).toEqual(
      expect.arrayContaining([
        "preview",
        "connect [client]",
        "screenshot [url]",
        "audit",
        "import",
        "permissions",
        "publish",
        "domains",
        "registry",
        "mcp",
        "$0",
      ])
    );
    expect(commandNames(commands)).not.toEqual(
      expect.arrayContaining(["publish deploy", "domains list"])
    );

    const publish = runGroupBuilder(commands, "publish");
    expect(publish.childCommands).toEqual(getExpectedGroupActions("publish"));
    expect(publish.demandCommand).toHaveBeenCalledWith(
      1,
      "Specify a publish command."
    );

    const domains = runGroupBuilder(commands, "domains");
    expect(domains.childCommands).toEqual(getExpectedGroupActions("domains"));
    expect(domains.demandCommand).toHaveBeenCalledWith(
      1,
      "Specify a domains command."
    );

    const registry = runGroupBuilder(commands, "registry");
    expect(registry.childCommands).toEqual(["inspect"]);
    expect(registry.demandCommand).toHaveBeenCalledWith(
      1,
      "Specify a registry command."
    );

    for (const { command } of apiCommandMetadata) {
      if (
        cliCommandMetadata.some(
          (cliCommand) => cliCommand.operation === command
        )
      ) {
        continue;
      }
      expect(commandNames(commands)).not.toContain(command);
    }
  });

  test("keeps grouped subcommands out of top-level help", async () => {
    const rootHelp = await getHelpOutput(["--help"]);

    expect(rootHelp).toContain("webstudio import");
    expect(rootHelp).toContain("webstudio publish");
    expect(rootHelp).toContain("webstudio domains");
    expect(rootHelp).toContain("webstudio schema [topic]");
    expect(rootHelp).toContain("webstudio mcp");
    expect(rootHelp).toContain("call MCP tools from the shell");
    expect(rootHelp).not.toContain("webstudio publish deploy");
    expect(rootHelp).not.toContain("webstudio domains list");

    const publishHelp = await getHelpOutput(["publish", "--help"]);
    expect(publishHelp).toContain("webstudio publish deploy");
    expect(publishHelp).toContain("webstudio publish list");

    const domainsHelp = await getHelpOutput(["domains", "--help"]);
    expect(domainsHelp).toContain("webstudio domains list");
    expect(domainsHelp).toContain("webstudio domains create");
  });

  test("shows audit-specific flags and examples", async () => {
    const output = await getHelpOutput(["audit", "--help"]);

    expect(output).toContain("webstudio audit");
    expect(output).toContain("--scopes");
    expect(output).toContain("--severities");
    expect(output).toContain("--page-path");
    expect(output).toContain("--page-id");
    expect(output).toContain("--limit");
    expect(output).toContain("--cursor");
    expect(output).toContain("--verbose");
    expect(output).toContain("--rendered");
    expect(output).toContain("--route-example");
    expect(output).toContain("--image-domain");
    expect(output).toContain("--confirm-large-run");
    expect(output).not.toContain("single-op-call <tool>");
  });

  test("keeps every documented audit CLI example compatible with audit help", async () => {
    const docs = await readFile(
      new URL("./docs/api-use-cases.md", import.meta.url),
      "utf8"
    );
    const commands = docs
      .split("\n")
      .filter((line) => line.startsWith("- webstudio audit "))
      .map((line) => line.slice("- webstudio ".length).trim());

    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) {
      const args = command.split(/\s+/).filter((arg) => arg !== "--json");
      const output = await getHelpOutput([...args, "--help"]);
      expect(output).toContain("webstudio audit");
      expect(output).not.toContain("single-op-call <tool>");
    }
  });

  test("documents registry inspection as a read-only nested command", async () => {
    const output = await getHelpOutput(["registry", "inspect", "--help"]);

    expect(output).toContain("--source");
    expect(output).toContain("--item");
    expect(output).toContain("No files are installed");
  });
});
