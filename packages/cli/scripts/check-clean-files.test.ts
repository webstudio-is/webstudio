import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(
  new URL("../../../scripts/check-clean-files.mjs", import.meta.url)
);

let tempDir: string;

const git = async (...args: string[]) =>
  await execFileAsync("git", args, { cwd: tempDir });

const runCheck = async (path: string) =>
  await execFileAsync("node", [scriptPath, path], { cwd: tempDir });

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-check-clean-files-"));
  await git("init");
  await git("config", "user.email", "test@example.com");
  await git("config", "user.name", "Test");
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

test("passes for clean tracked files", async () => {
  await writeFile(join(tempDir, "generated.ts"), "export const value = 1;\n");
  await git("add", "generated.ts");
  await git("commit", "-m", "add generated file");

  await expect(runCheck("generated.ts")).resolves.toMatchObject({
    stdout: "Generated files are clean.\n",
  });
});

test("fails for modified tracked files", async () => {
  await writeFile(join(tempDir, "generated.ts"), "export const value = 1;\n");
  await git("add", "generated.ts");
  await git("commit", "-m", "add generated file");
  await writeFile(join(tempDir, "generated.ts"), "export const value = 2;\n");

  await expect(runCheck("generated.ts")).rejects.toMatchObject({
    stderr: expect.stringContaining("M generated.ts"),
  });
});

test("fails for untracked files", async () => {
  await writeFile(join(tempDir, "generated.ts"), "export const value = 1;\n");

  await expect(runCheck("generated.ts")).rejects.toMatchObject({
    stderr: expect.stringContaining("?? generated.ts"),
  });
});
