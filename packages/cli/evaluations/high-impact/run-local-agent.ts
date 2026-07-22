import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  fontAssetsFixture,
  highImpactFixtures,
  type HighImpactFixture,
} from "./fixtures";
import { startHighImpactFixtureApi } from "./fixture-api";
import { evaluateHighImpactOutcome } from "./validate";
import { runHighImpactAgentEvaluation } from "./agent-runner";
import { collectHighImpactArtifacts } from "./artifacts";
import type { EvaluationToolCall } from "./validate";
import { writeFontAssetFixtureFiles } from "./font-assets-fixture";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

const fixtureById = new Map<string, HighImpactFixture>(
  highImpactFixtures.map((fixture) => [fixture.id, fixture])
);

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

const runFixture = async ({
  fixture,
  repositoryRoot,
  resultPath,
}: {
  fixture: HighImpactFixture;
  repositoryRoot: string;
  resultPath: string;
}) => {
  const localCli = resolve(repositoryRoot, "packages/cli/local.js");
  const codex = process.env.WEBSTUDIO_HIGH_IMPACT_CODEX ?? "codex";
  const model = process.env.WEBSTUDIO_HIGH_IMPACT_MODEL ?? "gpt-5.6-sol";
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
    ];
    const agentCommand = [
      shellQuote(codex),
      "exec",
      "--ephemeral",
      "--dangerously-bypass-approvals-and-sandbox",
      "--skip-git-repo-check",
      "--ignore-rules",
      "--model",
      shellQuote(model),
      "--cd",
      shellQuote(projectDirectory),
      ...mcpConfig.flatMap((config) => ["--config", shellQuote(config)]),
      shellQuote(
        "Read the evaluation task at $WEBSTUDIO_HIGH_IMPACT_AGENT_TASK and complete its objective using the configured Webstudio MCP."
      ),
    ].join(" ");
    let toolCalls: EvaluationToolCall[] = [];
    const readToolCalls = async () =>
      (await readFile(tracePath, "utf8").catch(() => ""))
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as EvaluationToolCall);
    return await runHighImpactAgentEvaluation({
      fixture,
      target: { kind: "source", repositoryRoot },
      agentCommand,
      cwd: projectDirectory,
      taskPath,
      resultPath,
      provider: "openai",
      model,
      env,
      getCallSequence: () => toolCalls.map(({ name }) => name),
      evaluate: async () => {
        toolCalls = await readToolCalls();
        return evaluateHighImpactOutcome({
          fixture,
          project: fixtureApi.getProject(),
          toolCalls,
          artifacts: await collectHighImpactArtifacts(projectDirectory),
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
    .strict()
    .help()
    .parse();
  const fixtures = selectFixtures(options.fixture);
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
  const results = [];
  for (const fixture of fixtures) {
    const resultPath = resolve(
      process.env.WEBSTUDIO_HIGH_IMPACT_RESULT ??
        join(resultsDirectory, `${fixture.id}.json`)
    );
    results.push(await runFixture({ fixture, repositoryRoot, resultPath }));
  }
  const outcome = results.every((result) => result.outcome === "passed")
    ? "passed"
    : "failed";
  process.stdout.write(
    `${JSON.stringify({ outcome, results }, undefined, 2)}\n`
  );
  if (outcome === "failed") {
    process.exitCode = 1;
  }
};

await run();
