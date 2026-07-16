import { describe, expect, test } from "vitest";
import { runAgentCommand } from "./run-agent-command";

describe("runAgentCommand", () => {
  test("returns the process exit code without capturing private output", async () => {
    await expect(
      runAgentCommand({
        command: `${JSON.stringify(process.execPath)} -e 'process.exit(7)'`,
        cwd: process.cwd(),
        env: process.env,
        timeoutMs: 5_000,
      })
    ).resolves.toMatchObject({ exitCode: 7, durationMs: expect.any(Number) });
  });

  test("terminates a timed-out process group", async () => {
    await expect(
      runAgentCommand({
        command: `${JSON.stringify(process.execPath)} -e 'setInterval(() => {}, 1000)'`,
        cwd: process.cwd(),
        env: process.env,
        timeoutMs: 50,
      })
    ).rejects.toThrow("Agent command timed out after 50ms.");
  });
});
