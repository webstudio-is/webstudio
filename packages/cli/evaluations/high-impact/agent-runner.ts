import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { HighImpactFixture } from "./fixtures";
import type {
  EvaluationToolCall,
  HighImpactEvaluationResult,
} from "./validate";
import {
  addAgentUsage,
  getAgentUsageEvent,
  getMcpEvaluationMetrics,
  type AgentUsage,
  type McpEvaluationMetrics,
} from "./evaluation-metrics";
import { runAgentCommand } from "../../scripts/run-agent-command";
import { boundedIdentifierPattern } from "../../src/type-utils";

export type AgentCliTarget =
  | { kind: "source"; repositoryRoot: string }
  | { kind: "packaged"; executable: string };

export type AgentEvaluationResult = {
  schemaVersion: 2;
  kind: "high-impact-minimal-context-agent-evaluation-result";
  fixtureId: HighImpactFixture["id"];
  outcome: "passed" | "failed";
  cli: "source" | "packaged";
  provider: string;
  model: string;
  commandSha256: string;
  exitCode: number;
  metrics: {
    durationMs: number;
    tokens?: AgentUsage;
    toolCalls: McpEvaluationMetrics;
  };
  callSequence: string[];
  checks: Record<string, "passed" | "failed">;
};

const forbiddenResultKeys =
  /(?:prompt|transcript|stdout|stderr|secret|credential|payload)/i;
const forbiddenTokenKey = /token/i;

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
      "Never use broad project reads: snapshot, components.list, or components.coverage-plan.",
      "Do not persist or report credentials or private session data.",
      "Treat mutation meta.next steps as required. Do not report completion until audit and requested visual evidence pass.",
      "Treat the successful final audit and requested visual evidence as terminal; do not mutate, verify, restart preview, or capture more evidence afterward.",
      "Finish all visual polish before evidence capture. After the first successful screenshot, do not mutate, rediscover, verify, or restart preview; capture only the remaining requested viewports, then make audit the next and final tool call.",
      ...(fixture.id === "authenticated-page-v1"
        ? [
            "For this fixture, meta.guide already returns the required auth discovery and authoring tool schemas. Do not call list-breakpoints because responsive styling is not required, and do not call meta.get_more_tools or any other tool discovery operation. Create exactly one scoped non-secret fixture variable, keep the required state gallery expression-free, and do not call list-variables again after creating it.",
          ]
        : []),
      ...(fixture.id === "design-input-v1"
        ? [
            "For this fixture, do not call list-instances because the project has no representative existing page pattern. Do not call meta.index, meta.get_more_tools, or any other tool discovery operation because meta.guide and the MCP handshake already provide the required schemas.",
            "For this fixture, make exactly three attach-design-token calls: attach only the returned Brand / Coral, Text / Ink, and Type / Heading token ids once each to compatible inserted element instance ids. Omit the optional position field and do not attempt any other token attachment.",
            "After the early binding checkpoint, make exactly one batched update-styles call containing all remaining fixed styles. Include at least one declaration on an inserted element using the returned mobile breakpoint id so responsive behavior is persisted before preview.",
            'Use this exact fragment verbatim in the single insert-fragment call; do not add props, styles, expressions, or alternate components until after it commits: <ws.element ws:tag="header"><ws.element ws:tag="nav"><ws.element ws:tag="a">Northstar</ws.element><ws.element ws:tag="button">Menu</ws.element></ws.element></ws.element><ws.element ws:tag="main"><ws.element ws:tag="section"><ws.element ws:tag="h1">Find your latitude</ws.element><ws.element ws:tag="p">Plan a memorable summer escape.</ws.element><ws.element ws:tag="a">Explore trips</ws.element></ws.element><ws.element ws:tag="section"><ws.element ws:tag="h2">Featured trips</ws.element><ws.element ws:tag="article"><ws.element ws:tag="h3">Coastal escape</ws.element><ws.element ws:tag="p">A restorative journey by the sea.</ws.element></ws.element></ws.element></ws.element><ws.element ws:tag="footer"><ws.element ws:tag="p">Northstar travel</ws.element></ws.element>',
          ]
        : []),
      ...(fixture.id === "font-assets-v1"
        ? [
            "For this fixture, do not call meta.index, meta.get_more_tools, or any other tool discovery operation because meta.guide and the MCP handshake already provide the required schemas. Upload both supplied fonts together with exactly one upload-assets call; do not use upload-asset.",
          ]
        : []),
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
  const visit = (value: unknown, path: string[] = []): void => {
    if (typeof value !== "object" || value === null) {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      const isAggregateUsage =
        path.length === 1 && path[0] === "metrics" && key === "tokens";
      const isMetricIdentifier =
        path.length === 3 &&
        path[0] === "metrics" &&
        path[1] === "toolCalls" &&
        [
          "failuresByTool",
          "failuresByCode",
          "issuesByCode",
          "durationsByTool",
        ].includes(path[2]);
      if (
        isMetricIdentifier === false &&
        (forbiddenResultKeys.test(key) ||
          (forbiddenTokenKey.test(key) && isAggregateUsage === false))
      ) {
        throw new Error(`Agent result contains forbidden field ${key}.`);
      }
      visit(child, [...path, key]);
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
  getToolCalls,
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
  getToolCalls: () => EvaluationToolCall[];
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
  let usage: AgentUsage | undefined;
  const execution = await runAgentCommand({
    command: agentCommand,
    cwd,
    env: { ...env, WEBSTUDIO_HIGH_IMPACT_AGENT_TASK: taskPath },
    timeoutMs,
    onStdoutLine: (line) => {
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch {
        return;
      }
      const eventUsage = getAgentUsageEvent(value);
      if (eventUsage !== undefined) {
        usage = addAgentUsage(usage, eventUsage);
      }
    },
  });
  const evaluation = await evaluate();
  const toolCalls = getToolCalls();
  const checks = {
    ...evaluation.checks,
    usageCaptured:
      usage === undefined ? ("failed" as const) : ("passed" as const),
  };
  const result: AgentEvaluationResult = {
    schemaVersion: 2,
    kind: "high-impact-minimal-context-agent-evaluation-result",
    fixtureId: fixture.id,
    outcome:
      execution.exitCode === 0 && evaluation.passed && usage !== undefined
        ? "passed"
        : "failed",
    cli: target.kind,
    provider,
    model,
    commandSha256: createHash("sha256").update(agentCommand).digest("hex"),
    exitCode: execution.exitCode,
    metrics: {
      durationMs: execution.durationMs,
      ...(usage === undefined ? {} : { tokens: usage }),
      toolCalls: getMcpEvaluationMetrics(toolCalls),
    },
    callSequence: toolCalls.map(({ name }) => name),
    checks,
  };
  assertBoundedResult(result);
  await mkdir(dirname(resultPath), { recursive: true });
  await writeFile(resultPath, JSON.stringify(result, undefined, 2), "utf8");
  return JSON.parse(
    await readFile(resultPath, "utf8")
  ) as AgentEvaluationResult;
};
