import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { HighImpactFixture } from "./fixtures";
import type { HighImpactEvaluationResult } from "./validate";
import { runAgentCommand } from "../../scripts/run-agent-command";
import { boundedIdentifierPattern } from "../../src/type-utils";

export type AgentCliTarget =
  | { kind: "source"; repositoryRoot: string }
  | { kind: "packaged"; executable: string };

export type AgentEvaluationResult = {
  schemaVersion: 1;
  kind: "high-impact-minimal-context-agent-evaluation-result";
  fixtureId: HighImpactFixture["id"];
  outcome: "passed" | "failed";
  cli: "source" | "packaged";
  provider: string;
  model: string;
  commandSha256: string;
  durationMs: number;
  exitCode: number;
  toolCallCount: number;
  focusedReadCount: number;
  callSequence: string[];
  checks: Record<string, "passed" | "failed">;
};

const forbiddenResultKeys =
  /(?:prompt|transcript|stdout|stderr|token|secret|credential|payload)/i;

export const getCliInvocation = (target: AgentCliTarget) =>
  target.kind === "source"
    ? {
        command: process.execPath,
        args: [resolve(target.repositoryRoot, "packages/cli/local.js"), "mcp"],
      }
    : { command: resolve(target.executable), args: ["mcp"] };

export const createMinimalAgentTask = (
  fixture: HighImpactFixture,
  target: AgentCliTarget
) => {
  const designReference =
    "designReference" in fixture
      ? (fixture as HighImpactFixture & { designReference: unknown })
          .designReference
      : undefined;
  return {
    schemaVersion: 1,
    fixtureId: fixture.id,
    objective: fixture.objective,
    ...(designReference === undefined ? {} : { designReference }),
    mcp: getCliInvocation(target),
    constraints: [
      "Use the configured Webstudio project and local CLI.",
      "Begin with meta.guide for the objective and follow its workflow.",
      "Choose focused reads and semantic edits yourself.",
      "Do not persist or report credentials or private session data.",
      "Treat mutation meta.next steps as required. Do not report completion until audit and requested visual evidence pass.",
    ],
  };
};

const assertBoundedResult = (result: AgentEvaluationResult) => {
  if (
    boundedIdentifierPattern.test(result.provider) === false ||
    boundedIdentifierPattern.test(result.model) === false
  ) {
    throw new Error("Agent provider and model must be bounded identifiers.");
  }
  const visit = (value: unknown): void => {
    if (typeof value !== "object" || value === null) {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenResultKeys.test(key)) {
        throw new Error(`Agent result contains forbidden field ${key}.`);
      }
      visit(child);
    }
  };
  visit(result);
  if (JSON.stringify(result).length > 12_000) {
    throw new Error("Agent result exceeds the bounded artifact limit.");
  }
};

export const runHighImpactAgentEvaluation = async ({
  fixture,
  target,
  agentCommand,
  cwd,
  taskPath,
  resultPath,
  provider,
  model,
  getCallSequence,
  evaluate,
  env = process.env,
  timeoutMs = 10 * 60_000,
}: {
  fixture: HighImpactFixture;
  target: AgentCliTarget;
  agentCommand: string;
  cwd: string;
  taskPath: string;
  resultPath: string;
  provider: string;
  model: string;
  getCallSequence: () => string[];
  evaluate: () => Promise<HighImpactEvaluationResult>;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}) => {
  await mkdir(dirname(taskPath), { recursive: true });
  await writeFile(
    taskPath,
    JSON.stringify(createMinimalAgentTask(fixture, target), undefined, 2),
    "utf8"
  );
  const execution = await runAgentCommand({
    command: agentCommand,
    cwd,
    env: { ...env, WEBSTUDIO_HIGH_IMPACT_AGENT_TASK: taskPath },
    timeoutMs,
  });
  const evaluation = await evaluate();
  const result: AgentEvaluationResult = {
    schemaVersion: 1,
    kind: "high-impact-minimal-context-agent-evaluation-result",
    fixtureId: fixture.id,
    outcome:
      execution.exitCode === 0 && evaluation.passed ? "passed" : "failed",
    cli: target.kind,
    provider,
    model,
    commandSha256: createHash("sha256").update(agentCommand).digest("hex"),
    durationMs: execution.durationMs,
    exitCode: execution.exitCode,
    toolCallCount: evaluation.metrics.toolCallCount,
    focusedReadCount: evaluation.metrics.focusedReadCount,
    callSequence: getCallSequence(),
    checks: evaluation.checks,
  };
  assertBoundedResult(result);
  await mkdir(dirname(resultPath), { recursive: true });
  await writeFile(resultPath, JSON.stringify(result, undefined, 2), "utf8");
  return JSON.parse(
    await readFile(resultPath, "utf8")
  ) as AgentEvaluationResult;
};
