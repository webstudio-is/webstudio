import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { authenticatedPageFixture } from "./fixtures";
import { designInputFixture } from "./fixtures";
import { fontAssetsFixture } from "./fixtures";
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
      constraints: expect.arrayContaining([
        expect.any(String),
        expect.stringContaining("exactly once at the beginning"),
        expect.any(String),
        expect.stringContaining("Never use broad project reads"),
        expect.any(String),
        expect.stringContaining("meta.next"),
        expect.stringContaining("successful final audit"),
        expect.stringContaining(
          "After the first successful screenshot, do not mutate"
        ),
        expect.stringContaining("Do not call list-breakpoints"),
      ]),
    });
    const authConstraints = task.constraints.join("\n");
    expect(authConstraints).toContain("Do not call list-breakpoints");
    expect(authConstraints).toContain("do not call meta.get_more_tools");
    expect(authConstraints).toContain(
      "Create exactly one scoped non-secret fixture variable"
    );
    expect(authConstraints).toContain("do not call list-variables again");
    expect(authConstraints).toContain("static audit");
    expect(authConstraints).toContain("do not set rendered:true");
    expect(authConstraints).toContain(
      "copy the objective field verbatim into brief"
    );
    expect(authConstraints).toContain("one parallel read batch");
    expect(authConstraints).toContain(
      "call create-page exactly once, then create-variable"
    );
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
        expect.stringContaining("exactly one batched update-styles call"),
        expect.stringContaining("returned mobile breakpoint id"),
        expect.stringContaining("Use this exact fragment verbatim"),
        expect.stringContaining('ws:tag="footer"'),
        expect.stringContaining("Do not call clone-instance"),
        expect.stringContaining("set-text-content"),
        expect.stringContaining("Call list-pages, list-breakpoints"),
        expect.stringContaining("one parallel tool-call batch"),
        expect.stringContaining("Attach all three tokens in one parallel"),
        expect.stringContaining("Do not call get-page-by-path"),
        expect.stringContaining(
          "verify-bindings immediately after insert-fragment"
        ),
        expect.stringContaining("do not call list-instances"),
        expect.stringContaining("Do not call meta.index"),
      ]),
    });
    expect(
      createMinimalAgentTask(fontAssetsFixture, {
        kind: "source",
        repositoryRoot: root,
      }).constraints
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Do not call meta.index, meta.get_more_tools"),
        expect.stringContaining("Call meta.guide exactly once"),
        expect.stringContaining("exactly one upload-assets call"),
        expect.stringContaining("parallel tool-call batch"),
        expect.stringContaining("parallel verification batch"),
      ])
    );
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
          {
            name: "meta.guide",
            startedAtMs: 100,
            durationMs: 25,
            responseBytes: 1_000,
          },
          {
            name: "attach-design-token",
            startedAtMs: 300,
            durationMs: 10,
            responseBytes: 500,
            isError: true,
            errorCode: "INVALID_INPUT",
          },
          {
            name: "audit",
            startedAtMs: 500,
            durationMs: 75,
            responseBytes: 750,
          },
        ],
        getCatalogObservations: () => [
          {
            kind: "tools-list",
            toolCount: 160,
            responseBytes: 100_000,
            inputSchemaBytes: 50_000,
            descriptionBytes: 10_000,
          },
        ],
        evaluate: async () => ({
          passed: true,
          checks: { privacy: "passed", audit: "passed" },
          failures: [],
        }),
      });
      expect(result).toMatchObject({
        schemaVersion: 2,
        outcome: "failed",
        cli: "packaged",
        metrics: {
          durationMs: expect.any(Number),
          tokens: {
            input: 1_000,
            cachedInput: 400,
            uncachedInput: 600,
            output: 200,
            total: 1_200,
          },
          mcpCatalog: {
            responses: 1,
            totalResponseBytes: 100_000,
            latestToolCount: 160,
            latestInputSchemaBytes: 50_000,
          },
          toolCalls: {
            total: 3,
            failed: 1,
            failuresByTool: { "attach-design-token": 1 },
            responseBytesByTool: {
              "attach-design-token": {
                count: 1,
                totalBytes: 500,
                p95Bytes: 500,
                maxBytes: 500,
              },
            },
            totalResponseBytes: 2_250,
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
