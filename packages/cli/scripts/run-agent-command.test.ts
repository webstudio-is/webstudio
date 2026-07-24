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

  test("observes stdout one line at a time without retaining it", async () => {
    const lines: string[] = [];
    await expect(
      runAgentCommand({
        command: `${JSON.stringify(process.execPath)} -e ${JSON.stringify(
          'process.stdout.write("first\\nsecond\\n")'
        )}`,
        cwd: process.cwd(),
        env: process.env,
        timeoutMs: 5_000,
        onStdoutLine: (line) => lines.push(line),
      })
    ).resolves.toMatchObject({ exitCode: 0, durationMs: expect.any(Number) });
    expect(lines).toEqual(["first", "second"]);
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

  test("terminates the process group when the caller aborts", async () => {
    const controller = new AbortController();
    const pending = runAgentCommand({
      command: `${JSON.stringify(process.execPath)} -e 'setInterval(() => {}, 1000)'`,
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 5_000,
      signal: controller.signal,
    });
    controller.abort();

    await expect(pending).rejects.toThrow(/aborted|signal SIGTERM/);
  });
});
