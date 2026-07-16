import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { HighImpactFixture } from "./fixtures";
import type { HighImpactEvaluationResult } from "./validate";

export type AgentCliTarget =
  | { kind: "source"; repositoryRoot: string }
  | { kind: "packaged"; executable: string };

export type AgentEvaluationEvidence = {
  schemaVersion: 1;
  kind: "high-impact-minimal-context-agent-evaluation";
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

const safeIdentifier = /^[A-Za-z0-9._:/-]{1,128}$/;
const forbiddenEvidenceKeys =
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
  const designEvidence =
    "designEvidence" in fixture
      ? (fixture as HighImpactFixture & { designEvidence: unknown })
          .designEvidence
      : undefined;
  return {
    schemaVersion: 1,
    fixtureId: fixture.id,
    objective: fixture.objective,
    ...(designEvidence === undefined ? {} : { designEvidence }),
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

const runCommand = (
  command: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number
) =>
  new Promise<{ exitCode: number; durationMs: number }>(
    (resolveRun, reject) => {
      const startedAt = Date.now();
      const child = spawn(process.env.SHELL ?? "/bin/sh", ["-c", command], {
        cwd,
        env,
        stdio: "ignore",
        detached: process.platform !== "win32",
      });
      const timeout = setTimeout(() => {
        if (child.pid !== undefined) {
          try {
            process.kill(process.platform === "win32" ? child.pid : -child.pid);
          } catch {}
        }
        reject(new Error("High-impact agent evaluation timed out."));
      }, timeoutMs);
      child.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once("exit", (code, signal) => {
        clearTimeout(timeout);
        if (signal !== null) {
          reject(
            new Error(`High-impact agent evaluation exited from ${signal}.`)
          );
          return;
        }
        resolveRun({
          exitCode: code ?? -1,
          durationMs: Date.now() - startedAt,
        });
      });
    }
  );

const assertBoundedEvidence = (evidence: AgentEvaluationEvidence) => {
  if (
    safeIdentifier.test(evidence.provider) === false ||
    safeIdentifier.test(evidence.model) === false
  ) {
    throw new Error("Agent provider and model must be bounded identifiers.");
  }
  const visit = (value: unknown): void => {
    if (typeof value !== "object" || value === null) {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenEvidenceKeys.test(key)) {
        throw new Error(`Agent evidence contains forbidden field ${key}.`);
      }
      visit(child);
    }
  };
  visit(evidence);
  if (JSON.stringify(evidence).length > 12_000) {
    throw new Error("Agent evidence exceeds the bounded artifact limit.");
  }
};

export const runHighImpactAgentEvaluation = async ({
  fixture,
  target,
  agentCommand,
  cwd,
  taskPath,
  evidencePath,
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
  evidencePath: string;
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
  const execution = await runCommand(
    agentCommand,
    cwd,
    { ...env, WEBSTUDIO_HIGH_IMPACT_AGENT_TASK: taskPath },
    timeoutMs
  );
  const result = await evaluate();
  const evidence: AgentEvaluationEvidence = {
    schemaVersion: 1,
    kind: "high-impact-minimal-context-agent-evaluation",
    fixtureId: fixture.id,
    outcome: execution.exitCode === 0 && result.passed ? "passed" : "failed",
    cli: target.kind,
    provider,
    model,
    commandSha256: createHash("sha256").update(agentCommand).digest("hex"),
    durationMs: execution.durationMs,
    exitCode: execution.exitCode,
    toolCallCount: result.metrics.toolCallCount,
    focusedReadCount: result.metrics.focusedReadCount,
    callSequence: getCallSequence(),
    checks: result.checks,
  };
  assertBoundedEvidence(evidence);
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, JSON.stringify(evidence, undefined, 2), "utf8");
  return JSON.parse(
    await readFile(evidencePath, "utf8")
  ) as AgentEvaluationEvidence;
};
