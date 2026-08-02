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
        expect.stringContaining("only through the configured webstudio MCP"),
        expect.stringContaining("Never use a shell"),
        expect.stringContaining("exactly once at the beginning"),
        expect.any(String),
        expect.stringContaining("Never use broad project reads"),
        expect.any(String),
        expect.stringContaining("meta.next"),
        expect.stringContaining("terminal static audit"),
        expect.stringContaining("Use one verify-page-responsive call"),
        expect.stringContaining("Do not call list-breakpoints"),
      ]),
    });
    const authConstraints = task.constraints.join("\n");
    expect(authConstraints).toContain("Do not call list-breakpoints");
    expect(authConstraints).toContain("do not call meta.get-more-tools");
    expect(authConstraints).toContain(
      "Create exactly one scoped non-secret fixture variable"
    );
    expect(authConstraints).toContain("Do not call list-variables again");
    expect(authConstraints).toContain("static audit");
    expect(authConstraints).toContain(
      "copy the objective field verbatim into brief"
    );
    expect(authConstraints).toContain("call inspect-auth-context exactly once");
    expect(authConstraints).not.toContain(
      "call get-project-settings, list-pages, list-resources, and list-variables"
    );
    expect(authConstraints).toContain("call create-page exactly once");
    expect(authConstraints).toContain(
      '"value":{"type":"string","value":"signed-out"}'
    );
    expect(authConstraints).toContain(
      "Call insert-fragment-verified only after all three succeed"
    );
    expect(authConstraints).toContain(
      "Do not call insert-fragment or verify-bindings separately"
    );
    expect(authConstraints).toContain(
      "call verify-page-responsive exactly once"
    );
    expect(authConstraints).toContain(
      "Do not call preview.start, screenshot, screenshot.responsive, or audit separately"
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
        expect.stringContaining('"breakpoint":"<returned-mobile'),
        expect.stringContaining("never breakpointId"),
        expect.stringContaining("Use this exact fragment verbatim"),
        expect.stringContaining('ws:tag="footer"'),
        expect.stringContaining("Do not call clone-instance"),
        expect.stringContaining("set-text-content"),
        expect.stringContaining("call inspect-design-context exactly once"),
        expect.stringContaining("Do not call list-pages, list-breakpoints"),
        expect.stringContaining("Attach all three tokens in one parallel"),
        expect.stringContaining("Do not call get-page-by-path"),
        expect.stringContaining("call insert-fragment-verified once"),
        expect.stringContaining("pagePath /summer"),
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
        expect.stringContaining("Do not call meta.index, meta.get-more-tools"),
        expect.stringContaining("Call meta.guide exactly once"),
        expect.stringContaining("exactly one upload-assets call"),
        expect.stringContaining("parallel tool-call batch"),
        expect.stringContaining("verify-font-assets exactly once"),
        expect.stringContaining(
          'audit exactly once with {"scopes":["assets"],"limit":10}'
        ),
        expect.stringContaining("Do not call refresh or get-asset separately"),
      ])
    );
    const blogConstraints = createMinimalAgentTask(markdownBlogFixture, {
      kind: "source",
      repositoryRoot: root,
    }).constraints.join("\n");
    expect(blogConstraints).toContain("one asset folder named Blog");
    expect(blogConstraints).toContain("one upload-assets call");
    expect(blogConstraints).toContain("aurora-trails.md");
    expect(blogConstraints).toContain("city-walks.md");
    expect(blogConstraints).toContain("Do not create or upload companion JSON");
    expect(blogConstraints).toContain('"format":"md"');
    expect(blogConstraints).toContain("/blog/:slug");
    expect(blogConstraints).toContain(
      '"field":["properties","draft"],"operator":"ne"'
    );
    expect(blogConstraints).toContain(
      '"value":{"type":"literal","value":true}'
    );
    expect(blogConstraints).toContain('"limit":{"type":"literal","value":20}');
    expect(blogConstraints).toContain('"offset":{"type":"literal","value":0}');
    expect(blogConstraints).toContain("Never call update-assets-resource");
    expect(blogConstraints).toContain(
      "Database size is part of the evaluated outcome"
    );
    expect(blogConstraints).toContain("one materialized overview");
    expect(blogConstraints).toContain("zero embedded Markdown body bytes");
    expect(blogConstraints).toContain("stale resource");
    expect(blogConstraints).toContain(
      '"fields":[["properties","title"],["properties","slug"]'
    );
    expect(blogConstraints).toContain('"mode":"none"');
    expect(blogConstraints).toContain('"mode":"markdown-body"');
    expect(blogConstraints).not.toContain('["properties","body"]');
    expect(blogConstraints).toContain('["properties","author"]');
    expect(blogConstraints).toContain("collectionItem.properties.author.name");
    expect(blogConstraints).toContain("collectionItem.content.text");
    expect(blogConstraints).toContain("$.MarkdownEmbed");
    expect(blogConstraints).toContain(
      "call verify-page-responsive exactly twice"
    );
    expect(blogConstraints).toContain('"path":"/blog/aurora-trails"');
    expect(blogConstraints).not.toContain(
      "Use one verify-page-responsive call for all requested viewports"
    );
    expect(getFixtureToolNames(markdownBlogFixture)).toEqual([
      "meta.guide",
      "meta.get-more-tools",
      "create-asset-folder",
      "upload-assets",
      "create-page",
      "create-assets-resource",
      "insert-collection",
      "verify-page-responsive",
    ]);
    expect(getFixtureToolNames(markdownBlogFixture)).not.toContain(
      "update-assets-resource"
    );

    const discoveryTask = createMinimalAgentTask(
      markdownReferencesDiscoveryFixture,
      {
        kind: "source",
        repositoryRoot: root,
      }
    );
    const discoveryPrompt = JSON.stringify(discoveryTask);
    expect(discoveryPrompt).not.toContain("$ref");
    expect(discoveryPrompt).not.toContain('"where"');
    expect(discoveryPrompt).not.toContain("markdown-body");
    expect(discoveryPrompt).not.toContain("collectionItem");
    expect(discoveryPrompt).toContain("Do not dry-run or plan mutations");
    expect(discoveryPrompt).toContain("without reshaping its fields");
    expect(discoveryPrompt).toContain(
      'exactly once with {\\"tools\\":[\\"create-assets-resource\\"]}'
    );
    expect(getFixtureToolNames(markdownReferencesDiscoveryFixture)).toEqual([
      "meta.guide",
      "meta.get-more-tools",
      "create-asset-folder",
      "upload-assets",
      "create-page",
      "create-assets-resource",
      "insert-collection",
      "verify-page-responsive",
    ]);
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
          expect.stringContaining("terminal static audit"),
          expect.stringContaining("Use one verify-page-responsive call"),
        ]),
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
