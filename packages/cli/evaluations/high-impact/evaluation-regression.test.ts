import { describe, expect, test } from "vitest";
import type { AgentEvaluationResult } from "./agent-runner";
import {
  compareEvaluationResult,
  isEvaluationComparisonAccepted,
} from "./evaluation-regression";

const createResult = (
  values: Partial<AgentEvaluationResult> = {}
): AgentEvaluationResult => ({
  schemaVersion: 2,
  kind: "high-impact-minimal-context-agent-evaluation-result",
  fixtureId: "authenticated-page-v1",
  outcome: "passed",
  cli: "source",
  provider: "openai",
  model: "test-model",
  commandSha256: "a".repeat(64),
  exitCode: 0,
  metrics: {
    durationMs: 1_000,
    tokens: {
      input: 800,
      cachedInput: 400,
      cacheWriteInput: 0,
      output: 200,
      reasoningOutput: 50,
      total: 1_000,
      cachedInputRate: 0.5,
    },
    toolCalls: {
      total: 10,
      succeeded: 10,
      failed: 0,
      retries: 0,
      focusedReads: 2,
      broadReads: 0,
      dryRuns: 1,
      plannedMutations: 1,
      committedMutations: 1,
      verifications: 2,
      totalDurationMs: 500,
      p50DurationMs: 30,
      p95DurationMs: 100,
      timeToFirstMutationMs: 400,
      timeToFirstVerificationMs: 800,
    },
  },
  callSequence: ["meta.guide", "create-page", "audit"],
  checks: { guidance: "passed", audit: "passed", usageCaptured: "passed" },
  ...values,
});

describe("evaluation regression comparison", () => {
  test("reports every numeric delta and blocks configured regressions", () => {
    const baseline = createResult();
    const baselineTokens = baseline.metrics.tokens;
    if (baselineTokens === undefined) {
      throw new Error("Expected baseline token metrics");
    }
    const current = createResult({
      metrics: {
        ...baseline.metrics,
        durationMs: 1_100,
        tokens: { ...baselineTokens, total: 1_200 },
      },
    });
    const comparison = compareEvaluationResult(current, baseline);
    expect(comparison.status).toBe("regressed");
    expect(comparison.deltas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "metrics.durationMs",
          baseline: 1_000,
          current: 1_100,
        }),
        expect.objectContaining({
          metric: "metrics.tokens.total",
          baseline: 1_000,
          current: 1_200,
        }),
      ])
    );
    expect(comparison.regressions).toEqual([
      expect.objectContaining({
        metric: "metrics.tokens.total",
        allowed: 1_150,
      }),
    ]);
  });

  test("blocks correctness regressions and skips incompatible baselines", () => {
    const baseline = createResult();
    expect(
      compareEvaluationResult(
        createResult({ checks: { ...baseline.checks, audit: "failed" } }),
        baseline
      ).regressions
    ).toEqual([
      {
        metric: "checks.audit",
        baseline: "passed",
        current: "failed",
      },
    ]);
    expect(
      compareEvaluationResult(
        createResult({ model: "different-model" }),
        baseline
      )
    ).toMatchObject({ status: "incompatible", deltas: [], regressions: [] });
    expect(compareEvaluationResult(createResult(), undefined)).toMatchObject({
      status: "missing",
      deltas: [],
      regressions: [],
    });
  });

  test("does not round count tolerances beyond the configured percentage", () => {
    const baseline = createResult();
    baseline.metrics.toolCalls.focusedReads = 9;
    const current = structuredClone(baseline);
    current.metrics.toolCalls.focusedReads = 11;
    expect(compareEvaluationResult(current, baseline).regressions).toEqual([
      {
        metric: "metrics.toolCalls.focusedReads",
        baseline: 9,
        current: 11,
        allowed: 10,
      },
    ]);
  });

  test("ignores insignificant absolute latency jitter", () => {
    const baseline = createResult();
    baseline.metrics.toolCalls.totalDurationMs = 73;
    const current = structuredClone(baseline);
    current.metrics.toolCalls.totalDurationMs = 84;
    expect(compareEvaluationResult(current, baseline)).toMatchObject({
      status: "passed",
      regressions: [],
    });
  });

  test("reports stochastic milestone timing without blocking one run", () => {
    const baseline = createResult();
    const current = structuredClone(baseline);
    current.metrics.durationMs = 20_000;
    current.metrics.toolCalls.timeToFirstMutationMs = 20_000;
    current.metrics.toolCalls.timeToFirstVerificationMs = 30_000;
    const comparison = compareEvaluationResult(current, baseline);
    expect(comparison).toMatchObject({ status: "passed", regressions: [] });
    expect(comparison.deltas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "metrics.toolCalls.timeToFirstMutationMs",
          current: 20_000,
        }),
        expect.objectContaining({
          metric: "metrics.toolCalls.timeToFirstVerificationMs",
          current: 30_000,
        }),
      ])
    );
  });

  test("requires accepted baselines and never accepts metric regressions", () => {
    const passed = compareEvaluationResult(createResult(), createResult());
    const missing = compareEvaluationResult(createResult(), undefined);
    const regressionCurrent = createResult();
    if (regressionCurrent.metrics.tokens === undefined) {
      throw new Error("Expected token metrics");
    }
    regressionCurrent.metrics.tokens.total = 2_000;
    const regressed = compareEvaluationResult(
      regressionCurrent,
      createResult()
    );
    expect(
      isEvaluationComparisonAccepted({
        comparison: passed,
        requireBaseline: true,
        updateBaselines: false,
      })
    ).toBe(true);
    expect(
      isEvaluationComparisonAccepted({
        comparison: missing,
        requireBaseline: true,
        updateBaselines: false,
      })
    ).toBe(false);
    expect(
      isEvaluationComparisonAccepted({
        comparison: missing,
        requireBaseline: true,
        updateBaselines: true,
      })
    ).toBe(true);
    expect(
      isEvaluationComparisonAccepted({
        comparison: regressed,
        requireBaseline: false,
        updateBaselines: true,
      })
    ).toBe(false);
  });
});
