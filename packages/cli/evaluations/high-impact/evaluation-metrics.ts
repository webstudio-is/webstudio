import { isPlainRecord } from "../../src/type-utils";
import type { EvaluationToolCall } from "./validate";

export type AgentUsage = {
  input: number;
  cachedInput: number;
  cacheWriteInput: number;
  output: number;
  reasoningOutput: number;
  total: number;
  cachedInputRate: number;
};

const getNonNegativeInteger = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;

const createAgentUsage = ({
  input,
  cachedInput,
  cacheWriteInput,
  output,
  reasoningOutput,
}: Omit<AgentUsage, "total" | "cachedInputRate">): AgentUsage => ({
  input,
  cachedInput,
  cacheWriteInput,
  output,
  reasoningOutput,
  total: input + output,
  cachedInputRate:
    input === 0 ? 0 : Math.round((cachedInput / input) * 10_000) / 10_000,
});

export const getAgentUsageEvent = (value: unknown): AgentUsage | undefined => {
  if (
    isPlainRecord(value) === false ||
    value.type !== "turn.completed" ||
    isPlainRecord(value.usage) === false
  ) {
    return;
  }
  const input = getNonNegativeInteger(value.usage.input_tokens);
  const cachedInput = getNonNegativeInteger(value.usage.cached_input_tokens);
  const cacheWriteInput = getNonNegativeInteger(
    value.usage.cache_write_input_tokens
  );
  const output = getNonNegativeInteger(value.usage.output_tokens);
  const reasoningOutput = getNonNegativeInteger(
    value.usage.reasoning_output_tokens
  );
  if (
    input === undefined ||
    cachedInput === undefined ||
    cacheWriteInput === undefined ||
    output === undefined ||
    reasoningOutput === undefined
  ) {
    return;
  }
  return createAgentUsage({
    input,
    cachedInput,
    cacheWriteInput,
    output,
    reasoningOutput,
  });
};

export const addAgentUsage = (
  left: AgentUsage | undefined,
  right: AgentUsage
) =>
  createAgentUsage({
    input: (left?.input ?? 0) + right.input,
    cachedInput: (left?.cachedInput ?? 0) + right.cachedInput,
    cacheWriteInput: (left?.cacheWriteInput ?? 0) + right.cacheWriteInput,
    output: (left?.output ?? 0) + right.output,
    reasoningOutput: (left?.reasoningOutput ?? 0) + right.reasoningOutput,
  });

export type McpEvaluationMetrics = {
  total: number;
  succeeded: number;
  failed: number;
  retries: number;
  focusedReads: number;
  broadReads: number;
  dryRuns: number;
  plannedMutations: number;
  committedMutations: number;
  verifications: number;
  totalDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  timeToFirstMutationMs?: number;
  timeToFirstVerificationMs?: number;
};

const broadReadNames = new Set([
  "snapshot",
  "components.list",
  "components.coverage-plan",
]);

const verificationNames = new Set([
  "audit",
  "screenshot",
  "screenshot.diff",
  "verify-bindings",
]);

export const isFocusedRead = (name: string) =>
  /^(?:list-|get-|inspect-|search-)/.test(name);

export const isBroadRead = (name: string) => broadReadNames.has(name);

const percentile = (values: number[], proportion: number) => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = values.toSorted((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * proportion) - 1);
  return sorted[index] ?? 0;
};

const countRetries = (calls: readonly EvaluationToolCall[]) => {
  const failedNames = new Set<string>();
  let retries = 0;
  for (const call of calls) {
    if (failedNames.has(call.name)) {
      retries += 1;
    }
    if (call.isError === true) {
      failedNames.add(call.name);
    } else {
      failedNames.delete(call.name);
    }
  }
  return retries;
};

export const getMcpEvaluationMetrics = (
  calls: readonly EvaluationToolCall[]
): McpEvaluationMetrics => {
  const durations = calls.flatMap(({ durationMs }) =>
    durationMs === undefined ? [] : [durationMs]
  );
  const firstMutation = calls.find(
    (call) => call.committed === true && call.isError !== true
  );
  const firstVerification = calls.find(
    (call) => verificationNames.has(call.name) && call.isError !== true
  );
  return {
    total: calls.length,
    succeeded: calls.filter((call) => call.isError !== true).length,
    failed: calls.filter((call) => call.isError === true).length,
    retries: countRetries(calls),
    focusedReads: calls.filter((call) => isFocusedRead(call.name)).length,
    broadReads: calls.filter((call) => isBroadRead(call.name)).length,
    dryRuns: calls.filter((call) => call.arguments?.dryRun === true).length,
    plannedMutations: calls.filter(
      (call) => call.planned === true && call.isError !== true
    ).length,
    committedMutations: calls.filter(
      (call) => call.committed === true && call.isError !== true
    ).length,
    verifications: calls.filter(
      (call) => verificationNames.has(call.name) && call.isError !== true
    ).length,
    totalDurationMs: durations.reduce((total, value) => total + value, 0),
    p50DurationMs: percentile(durations, 0.5),
    p95DurationMs: percentile(durations, 0.95),
    ...(firstMutation?.startedAtMs === undefined
      ? {}
      : { timeToFirstMutationMs: firstMutation.startedAtMs }),
    ...(firstVerification?.startedAtMs === undefined
      ? {}
      : { timeToFirstVerificationMs: firstVerification.startedAtMs }),
  };
};
