// Compares versioned evaluation results with compatible baselines and applies
// the suite's explicit quality and token-regression acceptance rules.
import type { AgentEvaluationResult } from "./agent-runner";

export type EvaluationMetricDelta = {
  metric: string;
  baseline: number;
  current: number;
  delta: number;
  deltaPercent?: number;
};

export type EvaluationRegression = {
  metric: string;
  baseline: number | "passed";
  current: number | "failed";
  allowed?: number;
};

export type EvaluationComparison = {
  status: "passed" | "regressed" | "missing" | "incompatible";
  baselineCommandSha256?: string;
  maxMetricRegressionPercent: number;
  maxTokenRegressionPercent: number;
  deltas: EvaluationMetricDelta[];
  regressions: EvaluationRegression[];
};

export const maxMetricRegressionPercent = 15;
export const maxTokenRegressionPercent = 50;

export const isEvaluationComparisonAccepted = ({
  comparison,
  requireBaseline,
  updateBaselines,
}: {
  comparison: EvaluationComparison;
  requireBaseline: boolean;
  updateBaselines: boolean;
}) => {
  if (comparison.status === "passed") {
    return true;
  }
  if (comparison.status === "regressed") {
    return false;
  }
  return updateBaselines || requireBaseline === false;
};

export const shouldUpdateEvaluationBaselines = ({
  updateBaselines,
  evaluationsPassed,
  comparisonsPassed,
  aggregateTokensPassed,
}: {
  updateBaselines: boolean;
  evaluationsPassed: boolean;
  comparisonsPassed: boolean;
  aggregateTokensPassed: boolean;
}) =>
  updateBaselines &&
  evaluationsPassed &&
  comparisonsPassed &&
  aggregateTokensPassed;

const isCompatibleBaseline = (
  current: AgentEvaluationResult,
  baseline: AgentEvaluationResult
) =>
  current.schemaVersion === baseline.schemaVersion &&
  current.fixtureId === baseline.fixtureId &&
  current.cli === baseline.cli &&
  current.provider === baseline.provider &&
  current.model === baseline.model &&
  current.reasoningEffort === baseline.reasoningEffort;

export const isAggregateTokenBaselineNonRegressed = (
  current: readonly AgentEvaluationResult[],
  baselines: readonly AgentEvaluationResult[]
) => {
  const baselineByFixture = new Map(
    baselines.map((baseline) => [baseline.fixtureId, baseline])
  );
  let currentTotal = 0;
  let baselineTotal = 0;
  let compared = 0;
  for (const result of current) {
    const baseline = baselineByFixture.get(result.fixtureId);
    if (
      baseline === undefined ||
      isCompatibleBaseline(result, baseline) === false
    ) {
      continue;
    }
    const currentTokens = result.metrics.tokens?.output;
    const baselineTokens = baseline.metrics.tokens?.output;
    if (currentTokens === undefined || baselineTokens === undefined) {
      return false;
    }
    currentTotal += currentTokens;
    baselineTotal += baselineTokens;
    compared += 1;
  }
  return compared === 0 || currentTotal <= baselineTotal;
};

const gatedMetricPaths = new Set([
  "metrics.tokens.output",
  "metrics.mcpCatalog.latestResponseBytes",
  "metrics.mcpCatalog.latestInputSchemaBytes",
  "metrics.toolCalls.total",
  "metrics.toolCalls.failed",
  "metrics.toolCalls.retries",
  "metrics.toolCalls.focusedReads",
  "metrics.toolCalls.broadReads",
  "metrics.toolCalls.totalResponseBytes",
]);

const getNumericMetrics = (
  value: unknown,
  path: string[] = [],
  metrics = new Map<string, number>()
) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    metrics.set(path.join("."), value);
    return metrics;
  }
  if (typeof value !== "object" || value === null) {
    return metrics;
  }
  for (const [key, child] of Object.entries(value)) {
    getNumericMetrics(child, [...path, key], metrics);
  }
  return metrics;
};

export const compareEvaluationResult = (
  current: AgentEvaluationResult,
  baseline: AgentEvaluationResult | undefined
): EvaluationComparison => {
  const empty = {
    maxMetricRegressionPercent,
    maxTokenRegressionPercent,
    deltas: [],
    regressions: [],
  };
  if (baseline === undefined) {
    return { status: "missing", ...empty };
  }
  if (isCompatibleBaseline(current, baseline) === false) {
    return { status: "incompatible", ...empty };
  }
  const baselineMetrics = getNumericMetrics(baseline.metrics, ["metrics"]);
  const currentMetrics = getNumericMetrics(current.metrics, ["metrics"]);
  const deltas: EvaluationMetricDelta[] = [];
  const regressions: EvaluationRegression[] = [];
  for (const [metric, baselineValue] of baselineMetrics) {
    const currentValue = currentMetrics.get(metric);
    if (currentValue === undefined) {
      continue;
    }
    const rawDelta = currentValue - baselineValue;
    const delta = Math.round(rawDelta * 10_000) / 10_000;
    deltas.push({
      metric,
      baseline: baselineValue,
      current: currentValue,
      delta,
      ...(baselineValue === 0
        ? {}
        : {
            deltaPercent:
              Math.round((rawDelta / baselineValue) * 100 * 100) / 100,
          }),
    });
    if (gatedMetricPaths.has(metric) === false) {
      continue;
    }
    const regressionPercent =
      metric === "metrics.tokens.output"
        ? maxTokenRegressionPercent
        : maxMetricRegressionPercent;
    const relativeIncrease = Math.floor(
      baselineValue * (regressionPercent / 100) +
        Number.EPSILON * Math.max(1, baselineValue)
    );
    const allowed = baselineValue + relativeIncrease;
    if (currentValue > allowed) {
      regressions.push({
        metric,
        baseline: baselineValue,
        current: currentValue,
        allowed,
      });
    }
  }
  for (const [check, baselineOutcome] of Object.entries(baseline.checks)) {
    if (baselineOutcome === "passed" && current.checks[check] === "failed") {
      regressions.push({
        metric: `checks.${check}`,
        baseline: "passed",
        current: "failed",
      });
    }
  }
  if (
    baseline.outcome === "passed" &&
    current.outcome === "failed" &&
    regressions.some(({ metric }) => metric.startsWith("checks.")) === false
  ) {
    regressions.push({
      metric: "outcome",
      baseline: "passed",
      current: "failed",
    });
  }
  return {
    status: regressions.length === 0 ? "passed" : "regressed",
    baselineCommandSha256: baseline.commandSha256,
    maxMetricRegressionPercent,
    maxTokenRegressionPercent,
    deltas,
    regressions,
  };
};
