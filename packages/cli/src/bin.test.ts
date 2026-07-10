import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const localPath = join(packageRoot, "local.js");
const rootPackagePath = join(packageRoot, "../..", "package.json");

test("keeps local source launcher wired to the root script", async () => {
  const rootPackageJson = JSON.parse(await readFile(rootPackagePath, "utf-8"));

  expect(rootPackageJson.scripts.webstudio).toBe("node packages/cli/local.js");
});

test("local launcher bootstraps source cli without caller-provided node options", () => {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.WEBSTUDIO_LOCAL_CLI_BOOTSTRAPPED;

  const result = spawnSync(
    process.execPath,
    [localPath, "man", "llm", "--json"],
    {
      cwd: packageRoot,
      env,
      encoding: "utf-8",
    }
  );

  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  expect(JSON.parse(result.stdout)).toMatchObject({
    topic: "llm",
  });
}, 15_000);

test("local launcher restores shell cwd when pnpm starts from package directory", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "webstudio-bin-cwd-test-"));
  const env: NodeJS.ProcessEnv = { ...process.env, PWD: projectRoot };
  delete env.NODE_OPTIONS;
  delete env.WEBSTUDIO_LOCAL_CLI_BOOTSTRAPPED;

  try {
    const result = spawnSync(
      process.execPath,
      [
        localPath,
        "init",
        "--link",
        "https://p-00000000-0000-4000-8000-000000000000.wstd.dev/?authToken=token",
        "--json",
      ],
      {
        cwd: packageRoot,
        env,
        encoding: "utf-8",
      }
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(existsSync(join(projectRoot, ".webstudio", "config.json"))).toBe(
      true
    );
    expect(existsSync(join(packageRoot, ".webstudio", "config.json"))).toBe(
      false
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}, 15_000);
