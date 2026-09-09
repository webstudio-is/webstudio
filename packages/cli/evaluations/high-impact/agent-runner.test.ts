import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { authenticatedPageFixture } from "./fixtures";
import { designInputFixture } from "./fixtures";
import {
  fontAssetsFixture,
  markdownBlogFixture,
  markdownReferencesDiscoveryFixture,
} from "./fixtures";
import {
  createMinimalAgentTask,
  getFixtureToolNames,
  getCliInvocation,
  runHighImpactAgentEvaluation,
} from "./agent-runner";

describe("high-impact agent runner", () => {
  test("serializes fixture contracts without embedding project state", () => {
    const root = resolve(import.meta.dirname, "../../../..");
    const target = { kind: "source", repositoryRoot: root } as const;
    expect(getCliInvocation(target)).toEqual({
      command: process.execPath,
      args: [resolve(root, "packages/cli/local.js"), "mcp"],
    });

    const authTask = createMinimalAgentTask(authenticatedPageFixture, target);
    expect(authTask).toMatchObject({
      schemaVersion: 2,
      fixtureId: authenticatedPageFixture.id,
      objective: authenticatedPageFixture.objective,
      guidance: {
        tool: "meta.guide",
        arguments: {
          workflow: "authenticated-page",
        },
        argumentBindings: { brief: "objective" },
        calls: 1,
        followReturnedWorkflow: true,
      },
      mcp: getCliInvocation(target),
    });

    const designTask = createMinimalAgentTask(designInputFixture, target);
    expect(designTask).toMatchObject({
      schemaVersion: 2,
      fixtureId: designInputFixture.id,
      objective: designInputFixture.objective,
      designReference: {
        desktop: { viewport: { width: 1440, height: 900 } },
        mobile: { viewport: { width: 390, height: 844 } },
      },
      guidance: {
        tool: "meta.guide",
        arguments: {
          workflow: "design-input",
        },
        argumentBindings: { brief: "objective" },
      },
    });

    const fontTask = createMinimalAgentTask(fontAssetsFixture, target);
    expect(fontTask.inputs).toEqual(fontAssetsFixture.agent.inputs);
    expect(fontTask.guidance).toEqual({
      tool: "meta.guide",
      arguments: {
        workflow: "font-assets",
      },
      argumentBindings: { brief: "objective" },
      calls: 1,
      followReturnedWorkflow: true,
    });
    const blogTask = createMinimalAgentTask(markdownBlogFixture, target);
    expect(blogTask.inputs).toEqual(markdownBlogFixture.agent.inputs);
    expect(blogTask.guidance).toEqual({
      tool: "meta.guide",
      arguments: {
        workflow: "markdown-blog",
      },
      argumentBindings: { brief: "objective" },
      calls: 1,
      followReturnedWorkflow: true,
    });
    expect(getFixtureToolNames(markdownBlogFixture)).toEqual([
      "meta.guide",
      "meta.get-more-tools",
      "create-asset-folder",
      "upload-assets",
      "create-page",
      "validate-asset-query",
      "preview-asset-query",
      "create-assets-resource",
      "insert-collection",
      "insert-fragment",
      "update-page",
      "verify-page-responsive",
    ]);
    expect(getFixtureToolNames(markdownBlogFixture)).not.toContain(
      "update-assets-resource"
    );

    const discoveryTask = createMinimalAgentTask(
      markdownReferencesDiscoveryFixture,
      target
    );
    expect(discoveryTask.inputs).toEqual(
      markdownReferencesDiscoveryFixture.agent.inputs
    );
    expect(discoveryTask.guidance).toEqual({
      tool: "meta.guide",
      arguments: {
        workflow: "markdown-blog",
      },
      argumentBindings: { brief: "objective" },
      calls: 1,
      followReturnedWorkflow: true,
    });
    expect(getFixtureToolNames(markdownReferencesDiscoveryFixture)).toEqual([
      "meta.guide",
      "meta.get-more-tools",
      "create-asset-folder",
      "upload-assets",
      "create-page",
      "validate-asset-query",
      "preview-asset-query",
      "create-assets-resource",
      "insert-collection",
      "insert-fragment",
      "update-page",
      "verify-page-responsive",
    ]);

    for (const task of [
      authTask,
      designTask,
      fontTask,
      blogTask,
      discoveryTask,
    ]) {
      expect(task).not.toHaveProperty("project");
      expect(JSON.stringify(task).split(task.objective)).toHaveLength(2);
      expect(task.constraints.length).toBeGreaterThan(0);
      expect(
        task.constraints.every((constraint) => typeof constraint === "string")
      ).toBe(true);
    }
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
        reasoningEffort: "low",
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
          checks: {
            privacy: "passed",
            audit: "passed",
            designTokenApplied: "passed",
          },
          failures: [],
        }),
      });
      expect(result).toMatchObject({
        schemaVersion: 3,
        outcome: "passed",
        cli: "packaged",
        reasoningEffort: "low",
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
        checks: {
          designTokenApplied: "passed",
          usageCaptured: "passed",
        },
      });
      const source = await readFile(resultPath, "utf8");
      expect(source).not.toMatch(/transcript|stdout|stderr|credential/i);
      expect(source).not.toContain(usageEvent);
      const task = JSON.parse(await readFile(taskPath, "utf8"));
      expect(task).toMatchObject({
        schemaVersion: 2,
        fixtureId: "authenticated-page-v1",
        mcp: { args: ["mcp"] },
        guidance: {
          tool: "meta.guide",
          arguments: {
            workflow: "authenticated-page",
          },
          argumentBindings: { brief: "objective" },
          calls: 1,
          followReturnedWorkflow: true,
        },
      });
      expect(task).not.toHaveProperty("project");
      expect(task.constraints).toEqual(
        expect.arrayContaining([expect.any(String)])
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
