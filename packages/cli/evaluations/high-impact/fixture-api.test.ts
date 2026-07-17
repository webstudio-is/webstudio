import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { authenticatedPageFixture } from "./fixtures";
import { startHighImpactFixtureApi } from "./fixture-api";

const execFileAsync = promisify(execFile);

describe("high-impact fixture API", () => {
  test("links and reads through the source CLI without persisting credentials", async () => {
    const fixtureApi = await startHighImpactFixtureApi(
      authenticatedPageFixture
    );
    const directory = await mkdtemp(join(tmpdir(), "high-impact-fixture-api-"));
    const configDirectory = join(directory, "config");
    const projectDirectory = join(directory, "project");
    const cli = resolve(import.meta.dirname, "../../local.js");
    await mkdir(projectDirectory, { recursive: true });
    const env = { ...process.env, WEBSTUDIO_CONFIG_DIR: configDirectory };
    try {
      const initialized = await execFileAsync(
        process.execPath,
        [cli, "init", "--link", fixtureApi.shareLink, "--json"],
        { cwd: projectDirectory, env }
      );
      expect(JSON.parse(initialized.stdout)).toMatchObject({
        ok: true,
        data: { projectId: "high-impact-evaluation-project" },
      });

      const listed = await execFileAsync(
        process.execPath,
        [cli, "list-pages", "{}"],
        { cwd: projectDirectory, env }
      );
      expect(JSON.parse(listed.stdout)).toMatchObject({
        ok: true,
        data: { pages: [expect.objectContaining({ name: "Home" })] },
        meta: {
          session: { buildId: "high-impact-evaluation-build" },
        },
      });
      expect(JSON.stringify(fixtureApi.getProject())).not.toContain(
        "fixture-only-not-persisted"
      );
    } finally {
      await fixtureApi.close();
      await rm(directory, { recursive: true, force: true });
    }
  }, 30_000);
});
