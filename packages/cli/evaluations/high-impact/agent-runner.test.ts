import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { authenticatedPageFixture } from "./fixtures";
import { designInputFixture } from "./fixtures";
import {
  createMinimalAgentTask,
  getCliInvocation,
  runHighImpactAgentEvaluation,
} from "./agent-runner";

describe("high-impact agent runner", () => {
  test("points source evaluations at the local CLI", () => {
    const root = resolve(import.meta.dirname, "../../../..");
    expect(getCliInvocation({ kind: "source", repositoryRoot: root })).toEqual({
      command: process.execPath,
      args: [resolve(root, "packages/cli/local.js"), "mcp"],
    });
    const task = createMinimalAgentTask(authenticatedPageFixture, {
      kind: "source",
      repositoryRoot: root,
    });
    expect(task).not.toHaveProperty("project");
    expect(task).toMatchObject({
      constraints: [
        expect.any(String),
        expect.stringContaining("meta.guide"),
        expect.any(String),
        expect.stringContaining("Never use broad project reads"),
        expect.any(String),
        expect.stringContaining("meta.next"),
        expect.stringContaining("successful final audit"),
        expect.stringContaining(
          "After the first successful screenshot, do not mutate"
        ),
      ],
    });
    expect(
      createMinimalAgentTask(designInputFixture, {
        kind: "source",
        repositoryRoot: root,
      })
    ).toMatchObject({
      designReference: {
        desktop: { viewport: { width: 1440, height: 900 } },
        mobile: { viewport: { width: 390, height: 844 } },
      },
      constraints: expect.arrayContaining([
        expect.stringContaining("exactly three attach-design-token calls"),
        expect.stringContaining("Omit the optional position field"),
      ]),
    });
  });

  test("retains only a bounded privacy-safe result from a real process", async () => {
    const directory = await mkdtemp(join(tmpdir(), "high-impact-agent-"));
    try {
      const resultPath = join(directory, "result.json");
      const taskPath = join(directory, "task.json");
      const usageEvent = JSON.stringify({
        type: "turn.completed",
        usage: {
          input_tokens: 1_000,
          cached_input_tokens: 400,
          cache_write_input_tokens: 50,
          output_tokens: 200,
          reasoning_output_tokens: 75,
        },
      });
      const result = await runHighImpactAgentEvaluation({
        fixture: authenticatedPageFixture,
        target: { kind: "packaged", executable: "/tmp/webstudio" },
        agentCommand: `${JSON.stringify(process.execPath)} -e ${JSON.stringify(
          `console.log(${JSON.stringify(usageEvent)})`
        )}`,
        cwd: directory,
        taskPath,
        resultPath,
        provider: "test-provider",
        model: "test-model",
        getToolCalls: () => [
          { name: "meta.guide", startedAtMs: 100, durationMs: 25 },
          {
            name: "attach-design-token",
            startedAtMs: 300,
            durationMs: 10,
            isError: true,
            errorCode: "INVALID_INPUT",
          },
          { name: "audit", startedAtMs: 500, durationMs: 75 },
        ],
        evaluate: async () => ({
          passed: true,
          checks: { privacy: "passed", audit: "passed" },
          failures: [],
        }),
      });
      expect(result).toMatchObject({
        schemaVersion: 2,
        outcome: "passed",
        cli: "packaged",
        metrics: {
          durationMs: expect.any(Number),
          tokens: {
            input: 1_000,
            cachedInput: 400,
            output: 200,
            total: 1_200,
          },
          toolCalls: {
            total: 3,
            failed: 1,
            failuresByTool: { "attach-design-token": 1 },
            verifications: 1,
            timeToFirstVerificationMs: 500,
          },
        },
        callSequence: ["meta.guide", "attach-design-token", "audit"],
        checks: { usageCaptured: "passed" },
      });
      const source = await readFile(resultPath, "utf8");
      expect(source).not.toMatch(/transcript|stdout|stderr|credential/i);
      expect(source).not.toContain(usageEvent);
      expect(JSON.parse(await readFile(taskPath, "utf8"))).toMatchObject({
        fixtureId: "authenticated-page-v1",
        mcp: { args: ["mcp"] },
        constraints: expect.arrayContaining([
          expect.stringContaining("successful final audit"),
          expect.stringContaining(
            "After the first successful screenshot, do not mutate"
          ),
        ]),
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
