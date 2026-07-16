import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  authenticatedPageFixture,
  designInputFixture,
  type HighImpactFixture,
} from "./fixtures";
import { startHighImpactFixtureApi } from "./fixture-api";
import { evaluateHighImpactOutcome } from "./validate";
import { runHighImpactAgentEvaluation } from "./agent-runner";
import { collectHighImpactArtifacts } from "./artifacts";
import type { EvaluationToolCall } from "./validate";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

const shellQuote = (value: string) => `'${value.replaceAll("'", `'"'"'`)}'`;

const run = async () => {
  const fixture: HighImpactFixture =
    process.env.WEBSTUDIO_HIGH_IMPACT_FIXTURE === "design-input-v1"
      ? designInputFixture
      : authenticatedPageFixture;
  const repositoryRoot = resolve(import.meta.dirname, "../../../..");
  const localCli = resolve(repositoryRoot, "packages/cli/local.js");
  const codex = process.env.WEBSTUDIO_HIGH_IMPACT_CODEX ?? "codex";
  const model = process.env.WEBSTUDIO_HIGH_IMPACT_MODEL ?? "gpt-5.6-sol";
  const resultPath = resolve(
    process.env.WEBSTUDIO_HIGH_IMPACT_RESULT ??
      join(import.meta.dirname, "results", `${fixture.id}.json`)
  );
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
    const result = await runHighImpactAgentEvaluation({
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
    process.stdout.write(`${JSON.stringify(result, undefined, 2)}\n`);
    if (result.outcome !== "passed") {
      process.exitCode = 1;
    }
  } finally {
    await fixtureApi.close();
    if (process.env.WEBSTUDIO_HIGH_IMPACT_KEEP_WORKSPACE === "1") {
      process.stderr.write(`Preserved evaluation workspace: ${directory}\n`);
    } else {
      await rm(directory, { recursive: true, force: true });
    }
  }
};

await run();
