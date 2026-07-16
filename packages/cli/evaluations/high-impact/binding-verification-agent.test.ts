import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, test } from "vitest";
import { authenticatedPageFixture } from "./fixtures";
import { startHighImpactFixtureApi } from "./fixture-api";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

test("runs verify-bindings through the local CLI with minimal MCP context", async () => {
  const repositoryRoot = resolve(import.meta.dirname, "../../../..");
  const directory = await mkdtemp(join(tmpdir(), "webstudio-binding-agent-"));
  temporaryDirectories.push(directory);
  const projectRoot = join(directory, "project");
  const configDirectory = join(directory, "config");
  const fixtureApi = await startHighImpactFixtureApi(authenticatedPageFixture);
  const env = { ...process.env, WEBSTUDIO_CONFIG_DIR: configDirectory };

  try {
    await mkdir(projectRoot, { recursive: true });
    const localCli = resolve(repositoryRoot, "packages/cli/local.js");
    await execFileAsync(
      process.execPath,
      [localCli, "init", "--link", fixtureApi.shareLink, "--json"],
      { cwd: projectRoot, env }
    );

    const runVerifyBindings = async (refresh = false) => {
      if (refresh) {
        await execFileAsync(
          process.execPath,
          [localCli, "mcp", "single-op-call", "refresh", "{}", "--json"],
          { cwd: projectRoot, env }
        );
      }
      const args = [
        localCli,
        "mcp",
        "single-op-call",
        "verify-bindings",
        '{"pagePath":"/"}',
        "--json",
      ];
      const result = await execFileAsync(process.execPath, args, {
        cwd: projectRoot,
        env,
      });
      return JSON.parse(result.stdout) as {
        ok: boolean;
        data: {
          analysis: {
            staticIntegrity: string;
            renderedResolution: string;
            externalResourcesExecuted: boolean;
          };
          findings: unknown[];
        };
      };
    };

    const first = await runVerifyBindings();
    await execFileAsync(process.execPath, [localCli, "sync"], {
      cwd: projectRoot,
      env,
    });
    const refreshed = await runVerifyBindings(true);

    expect(first).toMatchObject({
      ok: true,
      data: {
        analysis: {
          staticIntegrity: "complete",
          renderedResolution: "not-evaluated",
          externalResourcesExecuted: false,
        },
        findings: [],
      },
    });
    expect(refreshed).toEqual(first);
    expect(fixtureApi.getToolCalls()).toEqual([]);
  } finally {
    await fixtureApi.close();
  }
}, 120_000);
