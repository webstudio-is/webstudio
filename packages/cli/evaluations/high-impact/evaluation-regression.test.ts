import { describe, expect, test } from "vitest";
import type { AgentEvaluationResult } from "./agent-runner";
import {
  isAggregateTokenBaselineNonRegressed,
  compareEvaluationResult,
  isEvaluationComparisonAccepted,
  shouldUpdateEvaluationBaselines,
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
      uncachedInput: 400,
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
      failuresByTool: {},
      failuresByCode: {},
      issuesByCode: {},
      issuesByPath: {},
      durationsByTool: {},
      responseBytesByTool: {},
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
      totalResponseBytes: 10_000,
      p50ResponseBytes: 800,
      p95ResponseBytes: 2_000,
      maxResponseBytes: 3_000,
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
        tokens: {
          ...baselineTokens,
          input: 1_400,
          cachedInput: 400,
          uncachedInput: 1_000,
          output: 600,
          total: 2_000,
        },
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
          metric: "metrics.tokens.output",
          baseline: 200,
          current: 600,
        }),
      ])
    );
    expect(comparison.regressions).toEqual([
      expect.objectContaining({
        metric: "metrics.tokens.output",
        allowed: 300,
      }),
    ]);

    const noisyCurrent = structuredClone(baseline);
    noisyCurrent.metrics.tokens!.input = 1_200;
    noisyCurrent.metrics.tokens!.cachedInput = 800;
    noisyCurrent.metrics.tokens!.total = 1_400;
    expect(compareEvaluationResult(noisyCurrent, baseline)).toMatchObject({
      status: "passed",
      regressions: [],
    });
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

  test("reports environment-sensitive tool latency without blocking", () => {
    const baseline = createResult();
    const current = structuredClone(baseline);
    current.metrics.toolCalls.totalDurationMs = 20_000;
    current.metrics.toolCalls.p95DurationMs = 10_000;
    const comparison = compareEvaluationResult(current, baseline);
    expect(comparison).toMatchObject({ status: "passed", regressions: [] });
    expect(comparison.deltas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "metrics.toolCalls.totalDurationMs",
          current: 20_000,
        }),
        expect.objectContaining({
          metric: "metrics.toolCalls.p95DurationMs",
          current: 10_000,
        }),
      ])
    );
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

  test("blocks MCP catalog size regressions without gating client refreshes", () => {
    const baseline = createResult();
    baseline.metrics.mcpCatalog = {
      responses: 1,
      totalResponseBytes: 78_000,
      maxResponseBytes: 78_000,
      latestToolCount: 171,
      latestResponseBytes: 78_000,
      latestInputSchemaBytes: 41_000,
      latestDescriptionBytes: 13_000,
    };
    const current = structuredClone(baseline);
    current.metrics.mcpCatalog = {
      ...baseline.metrics.mcpCatalog,
      responses: 2,
      latestResponseBytes: 90_000,
      latestInputSchemaBytes: 48_000,
    };
    const comparison = compareEvaluationResult(current, baseline);
    expect(comparison.regressions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "metrics.mcpCatalog.latestResponseBytes",
        }),
        expect.objectContaining({
          metric: "metrics.mcpCatalog.latestInputSchemaBytes",
        }),
      ])
    );
    expect(comparison.regressions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric: "metrics.mcpCatalog.responses" }),
      ])
    );
    expect(comparison.deltas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric: "metrics.mcpCatalog.responses" }),
      ])
    );
  });

  test("blocks aggregate MCP response growth and reports tail changes", () => {
    const baseline = createResult();
    const current = structuredClone(baseline);
    current.metrics.toolCalls.totalResponseBytes = 12_000;
    current.metrics.toolCalls.p95ResponseBytes = 2_400;
    expect(compareEvaluationResult(current, baseline).regressions).toEqual([
      {
        metric: "metrics.toolCalls.totalResponseBytes",
        baseline: 10_000,
        current: 12_000,
        allowed: 11_500,
      },
    ]);
    expect(compareEvaluationResult(current, baseline).deltas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "metrics.toolCalls.p95ResponseBytes",
          baseline: 2_000,
          current: 2_400,
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
    regressionCurrent.metrics.tokens.input = 1_800;
    regressionCurrent.metrics.tokens.cachedInput = 400;
    regressionCurrent.metrics.tokens.uncachedInput = 1_400;
    regressionCurrent.metrics.tokens.output = 1_000;
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

  test("updates baselines only after outcomes and comparisons pass", () => {
    expect(
      shouldUpdateEvaluationBaselines({
        updateBaselines: true,
        evaluationsPassed: true,
        comparisonsPassed: true,
        aggregateTokensPassed: true,
      })
    ).toBe(true);
    expect(
      shouldUpdateEvaluationBaselines({
        updateBaselines: true,
        evaluationsPassed: true,
        comparisonsPassed: false,
        aggregateTokensPassed: true,
      })
    ).toBe(false);
    expect(
      shouldUpdateEvaluationBaselines({
        updateBaselines: true,
        evaluationsPassed: false,
        comparisonsPassed: true,
        aggregateTokensPassed: true,
      })
    ).toBe(false);
    expect(
      shouldUpdateEvaluationBaselines({
        updateBaselines: true,
        evaluationsPassed: true,
        comparisonsPassed: true,
        aggregateTokensPassed: false,
      })
    ).toBe(false);
  });

  test("does not ratchet an existing aggregate token baseline upward", () => {
    const withTokens = (
      fixtureId: AgentEvaluationResult["fixtureId"],
      total: number
    ) => {
      const result = createResult({ fixtureId });
      return {
        ...result,
        metrics: {
          ...result.metrics,
          tokens: {
            ...result.metrics.tokens!,
            input: total,
            cachedInput: 0,
            uncachedInput: total,
            output: total,
            total,
          },
        },
      };
    };
    const baselines = [
      withTokens("authenticated-page-v1", 1_000),
      withTokens("design-input-v1", 1_000),
    ];

    expect(
      isAggregateTokenBaselineNonRegressed(
        [
          withTokens("authenticated-page-v1", 900),
          withTokens("design-input-v1", 1_000),
        ],
        baselines
      )
    ).toBe(true);
    expect(
      isAggregateTokenBaselineNonRegressed(
        [
          withTokens("authenticated-page-v1", 1_001),
          withTokens("design-input-v1", 1_000),
        ],
        baselines
      )
    ).toBe(false);
    expect(
      isAggregateTokenBaselineNonRegressed(
        [withTokens("authenticated-page-v1", 1_000)],
        []
      )
    ).toBe(true);
  });
});
