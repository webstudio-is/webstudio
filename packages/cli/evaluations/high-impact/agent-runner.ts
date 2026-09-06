// Builds bounded high-impact agent tasks and turns their recorded MCP activity
// and final project state into versioned evaluation results.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { EvaluationReasoningEffort, HighImpactFixture } from "./fixtures";
import type {
  EvaluationToolCall,
  HighImpactEvaluationResult,
} from "./validate";
import {
  addAgentUsage,
  getAgentUsageEvent,
  getMcpCatalogMetrics,
  getMcpEvaluationMetrics,
  type AgentUsage,
  type McpCatalogMetrics,
  type McpCatalogObservation,
  type McpEvaluationMetrics,
} from "./evaluation-metrics";
import { runAgentCommand } from "../../scripts/run-agent-command";
import { boundedIdentifierPattern } from "../../src/type-utils";

export type AgentCliTarget =
  | { kind: "source"; repositoryRoot: string }
  | { kind: "packaged"; executable: string };

export type AgentEvaluationResult = {
  schemaVersion: 3;
  kind: "high-impact-minimal-context-agent-evaluation-result";
  fixtureId: HighImpactFixture["id"];
  outcome: "passed" | "failed";
  cli: "source" | "packaged";
  provider: string;
  model: string;
  reasoningEffort: EvaluationReasoningEffort;
  commandSha256: string;
  exitCode: number;
  metrics: {
    durationMs: number;
    tokens?: AgentUsage;
    mcpCatalog?: McpCatalogMetrics;
    toolCalls: McpEvaluationMetrics;
  };
  callSequence: string[];
  checks: Record<string, "passed" | "failed">;
};

const fixtureToolNames = {
  "authenticated-page-v1": [
    "meta.guide",
    "inspect-auth-context",
    "create-page",
    "create-variable",
    "create-resource",
    "insert-fragment-verified",
    "verify-page-responsive",
  ],
  "design-input-v1": [
    "meta.guide",
    "inspect-design-context",
    "create-page",
    "insert-fragment-verified",
    "attach-design-token",
    "update-styles",
    "verify-page-responsive",
  ],
  "font-assets-v1": [
    "meta.guide",
    "upload-assets",
    "update-asset",
    "verify-font-assets",
    "audit",
  ],
  "markdown-blog-v1": [
    "meta.guide",
    "meta.get-more-tools",
    "create-asset-folder",
    "upload-assets",
    "create-page",
    "validate-asset-query",
    "preview-asset-query",
    "create-assets-resource",
    "insert-collection",
    "insert-fragment",
    "update-page",
    "verify-page-responsive",
  ],
  "markdown-references-discovery-v1": [
    "meta.guide",
    "meta.get-more-tools",
    "create-asset-folder",
    "upload-assets",
    "create-page",
    "validate-asset-query",
    "preview-asset-query",
    "create-assets-resource",
    "insert-collection",
    "insert-fragment",
    "update-page",
    "verify-page-responsive",
  ],
} as const satisfies Record<HighImpactFixture["id"], readonly string[]>;

export const getFixtureToolNames = (fixture: HighImpactFixture) =>
  fixtureToolNames[fixture.id];

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
  const isMarkdownBlogFixture =
    fixture.id === "markdown-blog-v1" ||
    fixture.id === "markdown-references-discovery-v1";
  return {
    schemaVersion: 2,
    fixtureId: fixture.id,
    objective: fixture.objective,
    ...(designReference === undefined ? {} : { designReference }),
    ...(fixture.agent.inputs === undefined
      ? {}
      : { inputs: fixture.agent.inputs }),
    guidance: {
      tool: "meta.guide",
      arguments: fixture.agent.guidance,
      argumentBindings: { brief: "objective" },
      calls: 1,
      followReturnedWorkflow: true,
    },
    mcp: getCliInvocation(target),
    constraints: [
      "Use the configured Webstudio project and local CLI.",
      "Call Webstudio operations only through the configured webstudio MCP tools exposed directly in your tool list. Never use a shell, terminal, exec tool, node, webstudio CLI shortcut, mcp single-op-call, or mcp run. Shell-invoked operations are invisible to this evaluation and make the result fail.",
      "Run the guidance call exactly once before other tools, then follow its returned workflow and recipe.",
      "Choose focused reads and semantic edits yourself.",
      "Never use broad project reads: snapshot, components.list, or components.coverage-plan.",
      "Do not persist or report credentials or private session data.",
      "Treat mutation meta.next steps as required. Do not report completion until audit and requested visual evidence pass.",
      "Finish all visual polish before evidence capture. Run the planned verify-page-responsive calls consecutively, once per route with all requested viewports and that route's static audit. During this final verification sequence, make no mutations, discovery calls, preview restarts, or separate evidence calls. After the last planned route verification, make no more tool calls.",
      ...(isMarkdownBlogFixture
        ? [
            "Treat the supplied asset manifest as input inventory. Derive operation payloads from the MCP schemas and the markdown-blog guide instead of a fixture-specific answer.",
            "Substitute returned IDs only for the documented placeholders in the guide's recipe. Call each mutation once as a committed mutation; if one fails, stop and report it instead of retrying or inventing a repair workflow.",
          ]
        : []),
    ],
  };
};

const assertBoundedResult = (result: AgentEvaluationResult) => {
  const identifiers = [
    result.provider,
    result.model,
    ...result.callSequence,
    ...Object.keys(result.checks),
  ];
  if (
    identifiers.some(
      (identifier) => boundedIdentifierPattern.test(identifier) === false
    )
  ) {
    throw new Error("Agent result contains an invalid identifier.");
  }
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
  reasoningEffort,
  getToolCalls,
  getCatalogObservations,
  evaluate,
  env = process.env,
  timeoutMs = 10 * 60_000,
  signal,
}: {
  fixture: HighImpactFixture;
  target: AgentCliTarget;
  agentCommand: string;
  cwd: string;
  taskPath: string;
  resultPath: string;
  provider: string;
  model: string;
  reasoningEffort: EvaluationReasoningEffort;
  getToolCalls: () => EvaluationToolCall[];
  getCatalogObservations: () => McpCatalogObservation[];
  evaluate: () => Promise<HighImpactEvaluationResult>;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  signal?: AbortSignal;
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
    signal,
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
  const mcpCatalog = getMcpCatalogMetrics(getCatalogObservations());
  const checks = {
    ...evaluation.checks,
    usageCaptured:
      usage === undefined ? ("failed" as const) : ("passed" as const),
  };
  const toolCallMetrics = getMcpEvaluationMetrics(toolCalls);
  const result: AgentEvaluationResult = {
    schemaVersion: 3,
    kind: "high-impact-minimal-context-agent-evaluation-result",
    fixtureId: fixture.id,
    outcome:
      execution.exitCode === 0 && evaluation.passed && usage !== undefined
        ? "passed"
        : "failed",
    cli: target.kind,
    provider,
    model,
    reasoningEffort,
    commandSha256: createHash("sha256").update(agentCommand).digest("hex"),
    exitCode: execution.exitCode,
    metrics: {
      durationMs: execution.durationMs,
      ...(usage === undefined ? {} : { tokens: usage }),
      ...(mcpCatalog === undefined ? {} : { mcpCatalog }),
      toolCalls: toolCallMetrics,
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
