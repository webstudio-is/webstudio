import { describe, expect, test } from "vitest";
import {
  addAgentUsage,
  getAgentUsageEvent,
  getMcpCatalogMetrics,
  getMcpEvaluationMetrics,
} from "./evaluation-metrics";

describe("evaluation metrics", () => {
  test("aggregates MCP catalog observations", () => {
    expect(
      getMcpCatalogMetrics([
        {
          kind: "tools-list",
          toolCount: 160,
          responseBytes: 100_000,
          inputSchemaBytes: 50_000,
          descriptionBytes: 10_000,
        },
        {
          kind: "tools-list",
          toolCount: 12,
          responseBytes: 20_000,
          inputSchemaBytes: 8_000,
          descriptionBytes: 2_000,
        },
      ])
    ).toEqual({
      responses: 2,
      totalResponseBytes: 120_000,
      maxResponseBytes: 100_000,
      latestToolCount: 12,
      latestResponseBytes: 20_000,
      latestInputSchemaBytes: 8_000,
      latestDescriptionBytes: 2_000,
    });
  });

  test("retains only aggregate usage from Codex completion events", () => {
    const usage = getAgentUsageEvent({
      type: "turn.completed",
      usage: {
        input_tokens: 1_000,
        cached_input_tokens: 400,
        cache_write_input_tokens: 50,
        output_tokens: 200,
        reasoning_output_tokens: 75,
        private_message: "discard me",
      },
    });
    expect(usage).toEqual({
      input: 1_000,
      cachedInput: 400,
      uncachedInput: 600,
      cacheWriteInput: 50,
      output: 200,
      reasoningOutput: 75,
      total: 1_200,
      cachedInputRate: 0.4,
    });
    if (usage === undefined) {
      throw new Error("Expected aggregate usage");
    }
    expect(addAgentUsage(usage, usage)).toEqual({
      input: 2_000,
      cachedInput: 800,
      uncachedInput: 1_200,
      cacheWriteInput: 100,
      output: 400,
      reasoningOutput: 150,
      total: 2_400,
      cachedInputRate: 0.4,
    });
    expect(getAgentUsageEvent({ type: "item.completed", usage: {} })).toBe(
      undefined
    );
  });

  test("counts responsive page verification as early evidence", () => {
    expect(
      getMcpEvaluationMetrics([
        {
          name: "verify-page-responsive",
          startedAtMs: 25,
          durationMs: 100,
          responseBytes: 2_000,
        },
      ])
    ).toMatchObject({
      verifications: 1,
      timeToFirstVerificationMs: 25,
    });
  });

  test("measures MCP errors, retries, mutations, verification, and latency", () => {
    expect(
      getMcpEvaluationMetrics([
        {
          name: "meta.guide",
          startedAtMs: 10,
          durationMs: 10,
          responseBytes: 1_000,
        },
        {
          name: "snapshot",
          startedAtMs: 20,
          durationMs: 20,
          responseBytes: 6_000,
        },
        {
          name: "create-page",
          startedAtMs: 50,
          durationMs: 30,
          responseBytes: 500,
          isError: true,
          errorCode: "INVALID_INPUT",
          errorIssues: [{ code: "invalid_resource_url", path: "resource.url" }],
        },
        {
          name: "create-page",
          startedAtMs: 90,
          durationMs: 40,
          responseBytes: 2_000,
          committed: true,
        },
        {
          name: "update-page",
          arguments: { dryRun: true },
          startedAtMs: 110,
          durationMs: 50,
          responseBytes: 3_000,
          planned: true,
        },
        {
          name: "audit",
          startedAtMs: 170,
          durationMs: 100,
          responseBytes: 1_500,
        },
      ])
    ).toEqual({
      total: 6,
      succeeded: 5,
      failed: 1,
      failuresByTool: { "create-page": 1 },
      failuresByCode: { INVALID_INPUT: 1 },
      issuesByCode: { invalid_resource_url: 1 },
      issuesByPath: { "resource.url": 1 },
      durationsByTool: {
        audit: { count: 1, totalMs: 100, p95Ms: 100, maxMs: 100 },
        "create-page": { count: 2, totalMs: 70, p95Ms: 40, maxMs: 40 },
        "meta.guide": { count: 1, totalMs: 10, p95Ms: 10, maxMs: 10 },
        snapshot: { count: 1, totalMs: 20, p95Ms: 20, maxMs: 20 },
        "update-page": { count: 1, totalMs: 50, p95Ms: 50, maxMs: 50 },
      },
      responseBytesByTool: {
        audit: {
          count: 1,
          totalBytes: 1_500,
          p95Bytes: 1_500,
          maxBytes: 1_500,
        },
        "create-page": {
          count: 2,
          totalBytes: 2_500,
          p95Bytes: 2_000,
          maxBytes: 2_000,
        },
        "meta.guide": {
          count: 1,
          totalBytes: 1_000,
          p95Bytes: 1_000,
          maxBytes: 1_000,
        },
        snapshot: {
          count: 1,
          totalBytes: 6_000,
          p95Bytes: 6_000,
          maxBytes: 6_000,
        },
        "update-page": {
          count: 1,
          totalBytes: 3_000,
          p95Bytes: 3_000,
          maxBytes: 3_000,
        },
      },
      retries: 1,
      focusedReads: 0,
      broadReads: 1,
      dryRuns: 1,
      plannedMutations: 1,
      committedMutations: 1,
      verifications: 1,
      totalDurationMs: 250,
      p50DurationMs: 30,
      p95DurationMs: 100,
      totalResponseBytes: 14_000,
      p50ResponseBytes: 1_500,
      p95ResponseBytes: 6_000,
      maxResponseBytes: 6_000,
      timeToFirstMutationMs: 90,
      timeToFirstVerificationMs: 170,
    });
  });
});
