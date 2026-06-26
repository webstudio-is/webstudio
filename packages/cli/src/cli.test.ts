import { describe, expect, test, vi } from "vitest";
import { apiCommandMetadata } from "./commands/api-command-metadata";
import { registerCommands } from "./cli";
import type { CommonYargsArgv } from "./commands/yargs-types";

const createYargs = () => {
  const commands: string[] = [];
  const yargs = {
    command: vi.fn((command: string | string[]) => {
      commands.push(Array.isArray(command) ? (command[0] ?? "") : command);
      return yargs;
    }),
  };
  return { yargs: yargs as unknown as CommonYargsArgv, commands };
};

describe("registerCommands", () => {
  test("registers catalog commands and mcp command", () => {
    const { yargs, commands } = createYargs();

    registerCommands(yargs);

    for (const { command } of apiCommandMetadata) {
      expect(commands).toContain(command);
    }
    expect(commands).toContain("mcp");
    expect(commands).toContain("$0");
  });
});
