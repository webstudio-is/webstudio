import { describe, expect, test, vi } from "vitest";
import makeCLI from "yargs";
import {
  apiCommandMetadata,
  cliCommandMetadata,
} from "./commands/api-command-metadata";
import { registerCommands } from "./cli";
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

const getHelpOutput = async (args: string[]) => {
  let output = "";
  const yargs = makeCLI(args)
    .scriptName("webstudio")
    .exitProcess(false)
    .wrap(null)
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
  test("registers high-level API commands and mcp command", () => {
    const { yargs, commands } = createYargs();

    registerCommands(yargs);

    expect(commandNames(commands)).toEqual(
      expect.arrayContaining([
        "preview",
        "screenshot <url>",
        "import",
        "permissions",
        "publish",
        "domains",
        "mcp",
        "$0",
      ])
    );
    expect(commandNames(commands)).not.toEqual(
      expect.arrayContaining(["publish deploy", "domains list"])
    );

    const publish = runGroupBuilder(commands, "publish");
    expect(publish.childCommands).toEqual([
      "deploy",
      "list",
      "status",
      "unpublish",
    ]);
    expect(publish.demandCommand).toHaveBeenCalledWith(
      1,
      "Specify a publish command."
    );

    const domains = runGroupBuilder(commands, "domains");
    expect(domains.childCommands).toEqual([
      "list",
      "create",
      "update",
      "delete",
      "verify",
    ]);
    expect(domains.demandCommand).toHaveBeenCalledWith(
      1,
      "Specify a domains command."
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
    expect(rootHelp).not.toContain("webstudio publish deploy");
    expect(rootHelp).not.toContain("webstudio domains list");

    const publishHelp = await getHelpOutput(["publish", "--help"]);
    expect(publishHelp).toContain("webstudio publish deploy");
    expect(publishHelp).toContain("webstudio publish list");

    const domainsHelp = await getHelpOutput(["domains", "--help"]);
    expect(domainsHelp).toContain("webstudio domains list");
    expect(domainsHelp).toContain("webstudio domains create");
  });
});
