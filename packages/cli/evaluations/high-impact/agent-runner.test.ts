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
        expect.any(String),
        expect.stringContaining("meta.next"),
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
    });
  });

  test("retains only a bounded privacy-safe result from a real process", async () => {
    const directory = await mkdtemp(join(tmpdir(), "high-impact-agent-"));
    try {
      const resultPath = join(directory, "result.json");
      const taskPath = join(directory, "task.json");
      const result = await runHighImpactAgentEvaluation({
        fixture: authenticatedPageFixture,
        target: { kind: "packaged", executable: "/tmp/webstudio" },
        agentCommand: "node -e 'process.exit(0)'",
        cwd: directory,
        taskPath,
        resultPath,
        provider: "test-provider",
        model: "test-model",
        getCallSequence: () => ["meta.guide", "audit"],
        evaluate: async () => ({
          passed: true,
          checks: { privacy: "passed", audit: "passed" },
          failures: [],
          metrics: { toolCallCount: 6, focusedReadCount: 2 },
        }),
      });
      expect(result).toMatchObject({
        outcome: "passed",
        cli: "packaged",
        toolCallCount: 6,
        focusedReadCount: 2,
        callSequence: ["meta.guide", "audit"],
      });
      const source = await readFile(resultPath, "utf8");
      expect(source).not.toMatch(/transcript|stdout|stderr|credential/i);
      expect(JSON.parse(await readFile(taskPath, "utf8"))).toMatchObject({
        fixtureId: "authenticated-page-v1",
        mcp: { args: ["mcp"] },
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
