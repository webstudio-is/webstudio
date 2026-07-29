import { describe, expect, test } from "vitest";
import {
  addAgentUsage,
  getAgentUsageEvent,
  getMcpEvaluationMetrics,
} from "./evaluation-metrics";

describe("evaluation metrics", () => {
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

  test("measures MCP errors, retries, mutations, verification, and latency", () => {
    expect(
      getMcpEvaluationMetrics([
        { name: "meta.guide", startedAtMs: 10, durationMs: 10 },
        { name: "snapshot", startedAtMs: 20, durationMs: 20 },
        {
          name: "create-page",
          startedAtMs: 50,
          durationMs: 30,
          isError: true,
        },
        {
          name: "create-page",
          startedAtMs: 90,
          durationMs: 40,
          committed: true,
        },
        {
          name: "update-page",
          arguments: { dryRun: true },
          startedAtMs: 110,
          durationMs: 50,
          planned: true,
        },
        { name: "audit", startedAtMs: 170, durationMs: 100 },
      ])
    ).toEqual({
      total: 6,
      succeeded: 5,
      failed: 1,
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
      timeToFirstMutationMs: 90,
      timeToFirstVerificationMs: 170,
    });
  });
});
