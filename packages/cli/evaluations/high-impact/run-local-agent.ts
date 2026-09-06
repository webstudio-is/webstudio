// Orchestrates local high-impact agent fixtures, isolated project setup,
// content-database evidence, baseline comparison, and result persistence.
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createContentDatabase } from "@webstudio-is/content-engine";
import { compileContentSource } from "@webstudio-is/content-engine/compiler";
import { createReachableAssetContentCompilationPlan } from "@webstudio-is/sdk";
import {
  fontAssetsFixture,
  highImpactFixtures,
  markdownBlogFixture,
  markdownReferencesDiscoveryFixture,
  type HighImpactFixture,
} from "./fixtures";
import { startHighImpactFixtureApi } from "./fixture-api";
import { evaluateHighImpactOutcome } from "./validate";
import {
  runHighImpactAgentEvaluation,
  getFixtureToolNames,
  type AgentEvaluationResult,
} from "./agent-runner";
import { collectHighImpactArtifacts } from "./artifacts";
import type { EvaluationToolCall } from "./validate";
import type { McpCatalogObservation } from "./evaluation-metrics";
import { writeFontAssetFixtureFiles } from "./font-assets-fixture";
import { writeMarkdownBlogFixtureFiles } from "./markdown-blog-fixture";
import {
  createCliProjectSessionStorage,
  getCliProjectSessionFile,
} from "../../src/project-session";
import { createFileSystemContentSource } from "../../src/filesystem-content-source";
import {
  compareEvaluationResult,
  isAggregateTokenBaselineNonRegressed,
  isEvaluationComparisonAccepted,
  shouldUpdateEvaluationBaselines,
  type EvaluationComparison,
} from "./evaluation-regression";
import { runConcurrently } from "./suite-runner";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

const fixtureById = new Map<string, HighImpactFixture>(
  highImpactFixtures.map((fixture) => [fixture.id, fixture])
);

type AgentEvaluationReport = AgentEvaluationResult & {
  comparison: EvaluationComparison;
};

type EvaluationTraceEvent = EvaluationToolCall | McpCatalogObservation;

const isCatalogObservation = (
  event: EvaluationTraceEvent
): event is McpCatalogObservation =>
  "kind" in event && event.kind === "tools-list";

const shellQuote = (value: string) => `'${value.replaceAll("'", `'"'"'`)}'`;

const selectFixtures = (fixtureId: string | undefined) => {
  if (fixtureId === undefined) {
    return highImpactFixtures;
  }
  const fixture = fixtureById.get(fixtureId);
  if (fixture === undefined) {
    throw new Error(`Unknown evaluation fixture: ${fixtureId}`);
  }
  return [fixture];
};

type EvaluationProjectSnapshot = Awaited<
  ReturnType<ReturnType<typeof createCliProjectSessionStorage>["load"]>
>;

const getEvaluationContentCompilationInput = (
  snapshot: EvaluationProjectSnapshot
) => {
  if (snapshot === undefined) {
    throw new Error("Evaluation project session is unavailable");
  }
  const plan = createReachableAssetContentCompilationPlan({
    props: snapshot.state.props?.values() ?? [],
    dataSources: snapshot.state.dataSources?.values() ?? [],
    resources: snapshot.state.resources?.values() ?? [],
  });
  if (plan === undefined) {
    throw new Error("Evaluation blog has no reachable Assets resources");
  }
  return { snapshot, plan };
};

export const __testing__ = { getEvaluationContentCompilationInput };

const compileEvaluationContentDatabase = async (projectDirectory: string) => {
  const loadedSnapshot = await createCliProjectSessionStorage(
    getCliProjectSessionFile(projectDirectory)
  ).load();
  const { snapshot, plan } =
    getEvaluationContentCompilationInput(loadedSnapshot);
  const { artifact } = await compileContentSource({
    source: createFileSystemContentSource({
      projectId: snapshot.projectId,
      assets: Array.from(snapshot.state.assets?.values() ?? []),
      folders: snapshot.state.assetFolders ?? new Map(),
      assetsDirectory: join(projectDirectory, ".webstudio/assets"),
    }),
    projectId: snapshot.projectId,
    plan,
  });
  const stats = createContentDatabase({ artifact }).getStats();
  return {
    usedBytes: stats.usedBytes,
    maxBytes: stats.maxBytes,
    unboundedBytes: stats.unboundedBytes,
    sourceDocumentCount:
      stats.includedDocumentCount + stats.omittedDocumentCount,
    includedDocumentCount: stats.includedDocumentCount,
    omittedDocumentCount: stats.omittedDocumentCount,
    materializedQueryCount: Object.keys(artifact.queries ?? {}).length,
    documentGraphNodeCount: artifact.documentGraph?.nodes.length ?? 0,
    documentGraphEdgeCount: artifact.documentGraph?.edges.length ?? 0,
    embeddedContentBytes: Object.values(artifact.contents ?? {}).reduce(
      (total, content) => total + Buffer.byteLength(content),
      0
    ),
  };
};

const runFixture = async ({
  fixture,
  repositoryRoot,
  resultPath,
  signal,
}: {
  fixture: HighImpactFixture;
  repositoryRoot: string;
  resultPath: string;
  signal: AbortSignal;
}) => {
  const localCli = resolve(repositoryRoot, "packages/cli/local.js");
  const codex = process.env.WEBSTUDIO_HIGH_IMPACT_CODEX ?? "codex";
  const model = process.env.WEBSTUDIO_HIGH_IMPACT_MODEL ?? "gpt-5.4-mini";
  const reasoningEffort = fixture.agent.reasoningEffort;
  const directory = await mkdtemp(
    join(tmpdir(), "webstudio-high-impact-agent-")
  );
  const projectDirectory = join(directory, "project");
  const configDirectory = join(directory, "config");
  const taskPath = join(directory, "task.json");
  const tracePath = join(directory, "mcp-calls.jsonl");
  const traceProxy = join(import.meta.dirname, "mcp-trace-proxy.ts");
  const fixtureApi = await startHighImpactFixtureApi(fixture);
  await mkdir(projectDirectory, { recursive: true });
  if (fixture.id === fontAssetsFixture.id) {
    await writeFontAssetFixtureFiles(projectDirectory);
  } else if (
    fixture.id === markdownBlogFixture.id ||
    fixture.id === markdownReferencesDiscoveryFixture.id
  ) {
    await writeMarkdownBlogFixtureFiles(projectDirectory);
  }
  const env = { ...process.env, WEBSTUDIO_CONFIG_DIR: configDirectory };
  try {
    await execFileAsync(
      process.execPath,
      [localCli, "init", "--link", fixtureApi.shareLink, "--json"],
      { cwd: projectDirectory, env }
    );
    const mcpConfig = [
      `mcp_servers.webstudio.command=${JSON.stringify(process.execPath)}`,
      `mcp_servers.webstudio.args=${JSON.stringify([
        `--import=${pathToFileURL(require.resolve("tsx")).href}`,
        traceProxy,
        localCli,
        tracePath,
      ])}`,
      `mcp_servers.webstudio.cwd=${JSON.stringify(projectDirectory)}`,
      `mcp_servers.webstudio.env={ WEBSTUDIO_CONFIG_DIR = ${JSON.stringify(configDirectory)} }`,
      `mcp_servers.webstudio.enabled_tools=${JSON.stringify(getFixtureToolNames(fixture))}`,
    ];
    const agentCommand = [
      shellQuote(codex),
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--dangerously-bypass-approvals-and-sandbox",
      "--skip-git-repo-check",
      "--ignore-rules",
      "--json",
      "--model",
      shellQuote(model),
      "--config",
      shellQuote(`model_reasoning_effort="${reasoningEffort}"`),
      "--cd",
      shellQuote(projectDirectory),
      ...mcpConfig.flatMap((config) => ["--config", shellQuote(config)]),
      shellQuote(
        "Read the evaluation task at $WEBSTUDIO_HIGH_IMPACT_AGENT_TASK and complete its objective using the configured Webstudio MCP."
      ),
    ].join(" ");
    let toolCalls: EvaluationToolCall[] = [];
    let catalogObservations: McpCatalogObservation[] = [];
    const readTraceEvents = async () =>
      (await readFile(tracePath, "utf8").catch(() => ""))
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as EvaluationTraceEvent);
    return await runHighImpactAgentEvaluation({
      fixture,
      target: { kind: "source", repositoryRoot },
      agentCommand,
      cwd: projectDirectory,
      taskPath,
      resultPath,
      provider: "openai",
      model,
      reasoningEffort,
      env,
      signal,
      getToolCalls: () => toolCalls,
      getCatalogObservations: () => catalogObservations,
      evaluate: async () => {
        const traceEvents = await readTraceEvents();
        catalogObservations = traceEvents.filter(isCatalogObservation);
        toolCalls = traceEvents.filter(
          (event): event is EvaluationToolCall =>
            isCatalogObservation(event) === false
        );
        return evaluateHighImpactOutcome({
          fixture,
          project: fixtureApi.getProject(),
          toolCalls,
          artifacts: await collectHighImpactArtifacts(projectDirectory),
          ...(fixture.id === markdownBlogFixture.id ||
          fixture.id === markdownReferencesDiscoveryFixture.id
            ? {
                contentDatabase:
                  await compileEvaluationContentDatabase(projectDirectory),
              }
            : {}),
        });
      },
    });
  } finally {
    await fixtureApi.close();
    if (process.env.WEBSTUDIO_HIGH_IMPACT_KEEP_WORKSPACE === "1") {
      process.stderr.write(`Preserved evaluation workspace: ${directory}\n`);
    } else {
      await rm(directory, { recursive: true, force: true });
    }
  }
};

const run = async () => {
  const fixtureIds = highImpactFixtures.map(({ id }) => id);
  const args = hideBin(process.argv);
  if (args[0] === "--") {
    args.shift();
  }
  const options = await yargs(args)
    .option("fixture", {
      type: "string",
      choices: fixtureIds,
      description: "Run one evaluation fixture instead of the complete suite",
    })
    .option("baseline-directory", {
      type: "string",
      description: "Directory containing accepted per-fixture result baselines",
    })
    .option("require-baseline", {
      type: "boolean",
      default: true,
      description: "Fail when a compatible accepted baseline is unavailable",
    })
    .option("update-baselines", {
      type: "boolean",
      default: false,
      description:
        "Replace accepted baselines after every fixture passes; requires the complete suite",
    })
    .strict()
    .help()
    .parse();
  const fixtures = selectFixtures(options.fixture);
  if (options.updateBaselines && options.fixture !== undefined) {
    throw new Error(
      "Accepted baselines can only be updated by the complete suite."
    );
  }
  if (
    fixtures.length > 1 &&
    process.env.WEBSTUDIO_HIGH_IMPACT_RESULT !== undefined
  ) {
    throw new Error(
      "WEBSTUDIO_HIGH_IMPACT_RESULT can only be used with --fixture."
    );
  }
  const repositoryRoot = resolve(import.meta.dirname, "../../../..");
  const resultsDirectory = resolve(
    process.env.WEBSTUDIO_HIGH_IMPACT_RESULTS_DIR ??
      join(repositoryRoot, ".temp/evaluations/high-impact")
  );
  const baselineDirectory = resolve(
    options.baselineDirectory ??
      process.env.WEBSTUDIO_HIGH_IMPACT_BASELINE_DIR ??
      join(import.meta.dirname, "results")
  );

  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  const baselines: AgentEvaluationResult[] = [];
  const completed = await runConcurrently(fixtures, async (fixture) => {
    const resultPath = resolve(
      process.env.WEBSTUDIO_HIGH_IMPACT_RESULT ??
        join(resultsDirectory, `${fixture.id}.json`)
    );
    const result = await runFixture({
      fixture,
      repositoryRoot,
      resultPath,
      signal: controller.signal,
    });
    const baseline = await readFile(
      join(baselineDirectory, `${fixture.id}.json`),
      "utf8"
    )
      .then((source) => JSON.parse(source) as AgentEvaluationResult)
      .catch(() => undefined);
    const report = {
      ...result,
      comparison: compareEvaluationResult(result, baseline),
    };
    if (baseline !== undefined) {
      baselines.push(baseline);
    }
    await writeFile(
      resultPath,
      `${JSON.stringify(report, undefined, 2)}\n`,
      "utf8"
    );
    return { result, report };
  }).finally(() => {
    process.removeListener("SIGINT", abort);
    process.removeListener("SIGTERM", abort);
  });
  const rawResults = completed.map(({ result }) => result);
  const results: AgentEvaluationReport[] = completed.map(
    ({ report }) => report
  );
  const evaluationsPassed = rawResults.every(
    (result) => result.outcome === "passed"
  );
  const comparisonsPassed = results.every(({ comparison }) =>
    isEvaluationComparisonAccepted({
      comparison,
      requireBaseline: options.requireBaseline,
      updateBaselines: options.updateBaselines,
    })
  );
  const baselinesUpdated = shouldUpdateEvaluationBaselines({
    updateBaselines: options.updateBaselines,
    evaluationsPassed,
    comparisonsPassed,
    aggregateTokensPassed: isAggregateTokenBaselineNonRegressed(
      rawResults,
      baselines
    ),
  });
  if (baselinesUpdated) {
    await mkdir(baselineDirectory, { recursive: true });
    await Promise.all(
      rawResults.map((result) =>
        writeFile(
          join(baselineDirectory, `${result.fixtureId}.json`),
          `${JSON.stringify(result, undefined, 2)}\n`,
          "utf8"
        )
      )
    );
  }
  const outcome =
    evaluationsPassed &&
    comparisonsPassed &&
    (options.updateBaselines === false || baselinesUpdated)
      ? "passed"
      : "failed";
  process.stdout.write(
    `${JSON.stringify(
      {
        outcome,
        baselines: options.updateBaselines
          ? baselinesUpdated
            ? "updated"
            : "not-updated"
          : "compared",
        results,
      },
      undefined,
      2
    )}\n`
  );
  if (outcome === "failed") {
    process.exitCode = 1;
  }
};

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await run();
}
