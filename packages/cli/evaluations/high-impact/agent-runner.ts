import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { HighImpactFixture } from "./fixtures";
import { markdownBlogFixtureDocuments } from "./markdown-blog-fixture";
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
    "create-assets-resource",
    "insert-collection",
    "verify-page-responsive",
  ],
  "markdown-references-discovery-v1": [
    "meta.guide",
    "meta.get-more-tools",
    "create-asset-folder",
    "upload-assets",
    "create-page",
    "create-assets-resource",
    "insert-collection",
    "verify-page-responsive",
  ],
} as const satisfies Record<HighImpactFixture["id"], readonly string[]>;

const markdownBlogUploadInput = JSON.stringify({
  assets: markdownBlogFixtureDocuments.map(({ name, format }) => ({
    name,
    type: "file",
    format,
    folderId: "<blog-folder-id>",
    meta: {},
  })),
  assetsDir: ".webstudio/assets",
});

export const getFixtureToolNames = (fixture: HighImpactFixture) =>
  fixtureToolNames[fixture.id];

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
      "Call Webstudio operations only through the configured webstudio MCP tools exposed directly in your tool list. Never use a shell, terminal, exec tool, node, webstudio CLI shortcut, mcp single-op-call, or mcp run. Shell-invoked operations are invisible to this evaluation and make the result fail.",
      fixture.id === "markdown-blog-v1"
        ? 'Call meta.guide exactly once at the beginning with {"brief":"<objective>"}: copy the objective field verbatim into brief. Treat its response as reference only; the fixture sequence below is authoritative and supersedes every workflow or next-step suggestion. Do not call meta.guide again.'
        : 'Call meta.guide exactly once at the beginning with {"brief":"<objective>"}: copy the objective field verbatim into brief, follow the returned workflow, and do not call meta.guide again.',
      "Choose focused reads and semantic edits yourself.",
      "Never use broad project reads: snapshot, components.list, or components.coverage-plan.",
      "Do not persist or report credentials or private session data.",
      "Treat mutation meta.next steps as required. Do not report completion until audit and requested visual evidence pass.",
      ...(fixture.id === "markdown-blog-v1"
        ? []
        : [
            "Treat the successful final audit and requested visual evidence as terminal; do not mutate, verify, restart preview, or capture more evidence afterward.",
            "Finish all visual polish before evidence capture. Use one verify-page-responsive call for all requested viewports and the terminal static audit. After it begins, do not mutate, rediscover, restart preview, or capture more evidence.",
          ]),
      ...(fixture.id === "authenticated-page-v1"
        ? [
            "For this fixture, meta.guide already returns the required auth discovery and authoring tool schemas. Do not call list-breakpoints because responsive styling is not required, and do not call meta.get-more-tools or any other tool discovery operation. Create exactly one scoped non-secret fixture variable and keep the required state gallery expression-free. Do not call list-variables again after creating it.",
            "After meta.guide, call inspect-auth-context exactly once. Do not call get-project-settings, list-pages, list-resources, or list-variables separately.",
            'After the context read, call create-page exactly once. Then call create-variable exactly once with {"name":"Account preview state","scopeInstanceId":"<returned-account-root-id>","value":{"type":"string","value":"signed-out"}}, substituting only the returned root id. Keep type exactly string; do not invent a state type. Then call create-resource exactly once: copy recipe.createResourceInput from meta.guide as the entire create-resource tool input and substitute only its account root id placeholder. Do not wrap that input in another resource object. Keep name, method, url, headers, and searchParams nested under resource; never move them to the top level. Do not set exposeAsDataSource separately, parallelize these mutations, or retry failed calls. Call insert-fragment-verified only after all three succeed, using their returned ids and pagePath /account. Do not call insert-fragment or verify-bindings separately.',
            'Then call verify-page-responsive exactly once with {"path":"/account","viewports":[{"width":1440,"height":900},{"width":390,"height":844}],"source":"session"}. It captures both required screenshots and runs the terminal static audit. Do not call preview.start, screenshot, screenshot.responsive, or audit separately.',
          ]
        : []),
      ...(fixture.id === "markdown-references-discovery-v1"
        ? [
            'Follow the structured recipe returned by meta.guide. Pass each complete recipe object without reshaping its fields, changing only documented id placeholders. Call meta.get-more-tools exactly once with {"tools":["create-assets-resource"]}; do not search by brief or rediscover tools later.',
            "Create the Blog folder before uploading, and reuse that returned folder id for every uploaded article and both resource queries. Create exactly two create-assets-resource calls and exactly two insert-collection calls: one of each per page. Bind the overview Collection to the many-result overview data. For the detail Collection, wrap the one-result detail data as a zero-or-one-item array and render that item. Do not create repair or replacement resources or Collections.",
            "Call each mutation in the documented workflow once as a committed mutation. Do not dry-run or plan mutations. If any tool fails, stop immediately and report the failure; never retry it, repair it with repeated mutations, or continue to verification.",
            "Do not call verify-page-responsive until both Collections succeed. Then call it exactly once for /blog and exactly once for /blog/aurora-trails. Stop without retrying if either verification fails.",
          ]
        : []),
      ...(fixture.id === "design-input-v1"
        ? [
            "For this fixture, do not call list-instances because the project has no representative existing page pattern. Do not call meta.index, meta.get-more-tools, or any other tool discovery operation because meta.guide and the MCP handshake already provide the required schemas.",
            "After meta.guide, call inspect-design-context exactly once before mutation. Do not call list-pages, list-breakpoints, list-design-tokens, list-assets, or list-variables separately. Do not call get-page-by-path or repeat discovery. Call create-page once, then call insert-fragment-verified once with pagePath /summer before token or style mutations. Do not call insert-fragment or verify-bindings separately.",
            "For this fixture, make exactly three attach-design-token calls: attach only the returned Brand / Coral, Text / Ink, and Type / Heading token ids once each to compatible inserted element instance ids. Attach all three tokens in one parallel tool-call batch. Omit the optional position field and do not attempt any other token attachment.",
            'After the early binding checkpoint, make exactly one batched update-styles call containing all remaining fixed styles. Its updates array must include an item shaped exactly {"instanceId":"<returned-main-or-section-instance-id>","property":"padding-left","value":{"type":"keyword","value":"16px"},"breakpoint":"<returned-mobile-breakpoint-id>"}, substituting only returned ids. The update-styles field is breakpoint, never breakpointId. Do not omit this mobile item; it proves responsive behavior is persisted before preview.',
            'Use this exact fragment verbatim in the single insert-fragment-verified call; do not add props, styles, expressions, or alternate components until after it commits: <ws.element ws:tag="header"><ws.element ws:tag="nav"><ws.element ws:tag="a">Northstar</ws.element><ws.element ws:tag="button">Menu</ws.element></ws.element></ws.element><ws.element ws:tag="main"><ws.element ws:tag="section"><ws.element ws:tag="h1">Find your latitude</ws.element><ws.element ws:tag="p">Plan a memorable summer escape.</ws.element><ws.element ws:tag="a">Explore trips</ws.element></ws.element><ws.element ws:tag="section"><ws.element ws:tag="h2">Featured trips</ws.element><ws.element ws:tag="article"><ws.element ws:tag="h3">Coastal escape</ws.element><ws.element ws:tag="p">A restorative journey by the sea.</ws.element></ws.element></ws.element></ws.element><ws.element ws:tag="footer"><ws.element ws:tag="p">Northstar travel</ws.element></ws.element>',
            "The exact fragment already contains all required content. Do not call clone-instance, update-text, set-text-content, or any other content or structure mutation after insertion; only attach the three tokens and apply the one batched style update.",
            'After the style update, call verify-page-responsive exactly once with {"path":"/summer","viewports":[{"width":1440,"height":900},{"width":390,"height":844}],"source":"session"}. It captures both required screenshots and runs the terminal static audit. Do not call preview.start, screenshot, screenshot.responsive, or audit separately.',
          ]
        : []),
      ...(fixture.id === "font-assets-v1"
        ? [
            "Do not call meta.index, meta.get-more-tools, or any other tool discovery operation because meta.guide and the MCP handshake already provide the required schemas. Upload both supplied fonts together with exactly one upload-assets call; do not use upload-asset.",
            'After upload, update both font assets together in one parallel tool-call batch. For each returned asset id, use exactly {"assetId":"<returned-asset-id>","values":{"meta":{"family":"Rajdhani","style":"normal","weight":600}}}. Keep family, style, and weight inside values.meta; do not send an empty values object. Make exactly two update-asset calls total and stop instead of retrying if either fails.',
            'After both updates, call verify-font-assets exactly once with both returned asset ids, then call audit exactly once with {"scopes":["assets"],"limit":10}. Do not call refresh or get-asset separately.',
          ]
        : []),
      ...(fixture.id === "markdown-blog-v1"
        ? [
            'For this fixture, call meta.get-more-tools exactly once immediately after meta.guide with {"brief":"create-assets-resource"} to load the complete schema for its complex query input. Do not call meta.index, list/get/preview asset tools, list pages, or any other discovery operation. Then create one asset folder named Blog and upload all supplied Markdown files together with exactly one upload-assets call using type file, format md, that returned folder id, empty metadata, and assetsDir .webstudio/assets. Do not create or upload companion JSON descriptors.',
            `Use this exact upload-assets input, substituting only the returned Blog folder id for <blog-folder-id>: ${markdownBlogUploadInput}.`,
            "For this fixture, the exact sequence below supersedes every workflow and mutation meta.next suggestion. After a listed call succeeds, continue immediately to the next listed call without inspecting, repairing, updating, or repeating its result. If any call fails, stop immediately; retries and repair mutations fail this evaluation. Never call update-assets-resource or any tool not explicitly listed in these fixture constraints.",
            "Create exactly two pages: first /blog, then /blog/:slug. Do not call create-assets-resource while creating either page. Never call create-assets-resource without a query. After both page calls succeed, make exactly two create-assets-resource calls total using the complete inputs below; any omitted query or additional resource fails this evaluation.",
            "Database size is part of the evaluated outcome. The final project must have exactly the two intended reachable Assets queries, one materialized overview, all five source documents included without truncation, and zero embedded Markdown body bytes. Do not leave a placeholder, preview copy, stale resource, or replacement data source in the project.",
            'First call create-assets-resource exactly once with this complete overview input, substituting the returned overview root id and Blog folder id: {"name":"Published posts","scopeInstanceId":"<overview-root-id>","dataSourceName":"posts","query":{"result":"many","where":{"all":[{"field":["extension"],"operator":"eq","value":{"type":"literal","value":"md"}},{"field":["folderId"],"operator":"eq","value":{"type":"literal","value":"<blog-folder-id>"}},{"field":["properties","draft"],"operator":"ne","value":{"type":"literal","value":true}}]},"sort":[{"field":["properties","publishedAt"],"direction":"desc"},{"field":["id"],"direction":"asc"}],"limit":{"type":"literal","value":20},"offset":{"type":"literal","value":0},"output":{"mode":"fields","includeMetadata":false,"fields":[["properties","title"],["properties","slug"],["properties","publishedAt"],["properties","author"],["properties","excerpt"]]},"content":{"mode":"none"}}}. Keep literal wrappers and field-path arrays unchanged.',
            'Then call create-assets-resource exactly once with this complete detail input, substituting the returned detail root id and the same Blog folder id: {"name":"Post by slug","scopeInstanceId":"<detail-root-id>","dataSourceName":"post","query":{"result":"one","where":{"all":[{"field":["extension"],"operator":"eq","value":{"type":"literal","value":"md"}},{"field":["folderId"],"operator":"eq","value":{"type":"literal","value":"<blog-folder-id>"}},{"field":["properties","slug"],"operator":"eq","value":"system.params.slug"}]},"output":{"mode":"fields","includeMetadata":false,"fields":[["properties","title"],["properties","author"]]},"content":{"mode":"markdown-body-ref"}}}. Do not call create-assets-resource again.',
            'After both resources succeed, call insert-collection exactly once on the overview root with {"parentInstanceId":"<overview-root-id>","data":{"type":"expression","value":"posts.data"},"itemFragment":"<ws.element ws:tag=\"article\"><ws.element ws:tag=\"h2\">{expression`collectionItem.properties.title ?? \\"Untitled\\"`}</ws.element><ws.element ws:tag=\"p\">{expression`collectionItem.properties.excerpt ?? \\"\\"`}</ws.element><ws.element ws:tag=\"p\">By {expression`collectionItem.properties.author.name`}</ws.element><ws.element ws:tag=\"time\">{expression`collectionItem.properties.publishedAt ?? \\"\\"`}</ws.element><ws.element ws:tag=\"a\" href={expression`\\"/blog/\\" + collectionItem.properties.slug`}>Read article</ws.element></ws.element>"}, substituting only the returned overview root id.',
            'Then call insert-collection exactly once on the detail root with {"parentInstanceId":"<detail-root-id>","data":{"type":"expression","value":"post.data == null ? [] : [post.data]"},"itemFragment":"<ws.element ws:tag=\"article\"><ws.element ws:tag=\"h1\">{expression`collectionItem.properties.title ?? \\"Untitled\\"`}</ws.element><ws.element ws:tag=\"p\">By {expression`collectionItem.properties.author.name`}</ws.element><$.MarkdownEmbed code={expression`collectionItem.content.text`} /></ws.element>"}, substituting only the returned detail root id. insert-collection validates and persists its bindings atomically, so do not call verify-bindings or perform any repair afterward.',
            'After both Collections succeed, call verify-page-responsive exactly twice: first with {"path":"/blog","viewports":[{"width":1440,"height":900},{"width":390,"height":844}],"source":"session"}, then with {"path":"/blog/aurora-trails","viewports":[{"width":1440,"height":900},{"width":390,"height":844}],"source":"session"}. Do not mutate, rediscover, restart preview, or capture separate screenshots or audits after verification begins. If either verification fails, stop immediately without retrying or changing the project.',
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
          "issuesByPath",
          "durationsByTool",
          "responseBytesByTool",
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
    schemaVersion: 2,
    kind: "high-impact-minimal-context-agent-evaluation-result",
    fixtureId: fixture.id,
    outcome:
      execution.exitCode === 0 &&
      evaluation.passed &&
      usage !== undefined &&
      toolCallMetrics.failed === 0 &&
      toolCallMetrics.retries === 0
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
