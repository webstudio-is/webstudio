import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(
  new URL("../../../scripts/check-package-boundaries.mjs", import.meta.url)
);

let tempDir: string;

const writeJson = async (path: string, value: unknown) => {
  await mkdir(join(tempDir, path, ".."), { recursive: true });
  await writeFile(join(tempDir, path), JSON.stringify(value, undefined, 2));
};

const runCheck = async () =>
  await execFileAsync("node", [scriptPath], { cwd: tempDir });

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-package-boundaries-"));
  await mkdir(join(tempDir, "packages"), { recursive: true });
  await mkdir(join(tempDir, "apps"), { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

test("passes when public packages depend only on public packages at runtime", async () => {
  await writeJson("packages/public-a/package.json", {
    name: "@webstudio-is/public-a",
    private: false,
    dependencies: {
      "@webstudio-is/public-b": "workspace:*",
    },
  });
  await writeJson("packages/public-b/package.json", {
    name: "@webstudio-is/public-b",
    private: false,
  });

  await expect(runCheck()).resolves.toMatchObject({
    stdout: "Package boundaries are valid.\n",
  });
});

test("passes when public packages use private packages only for dev-time generation", async () => {
  await writeJson("packages/public/package.json", {
    name: "@webstudio-is/public",
    private: false,
    devDependencies: {
      "@webstudio-is/private": "workspace:*",
    },
  });
  await writeJson("packages/private/package.json", {
    name: "@webstudio-is/private",
    private: true,
  });

  await expect(runCheck()).resolves.toMatchObject({
    stdout: "Package boundaries are valid.\n",
  });
});

test("fails when public packages depend on private packages at runtime", async () => {
  await writeJson("packages/public/package.json", {
    name: "@webstudio-is/public",
    private: false,
    dependencies: {
      "@webstudio-is/private": "workspace:*",
    },
  });
  await writeJson("packages/private/package.json", {
    name: "@webstudio-is/private",
    private: true,
  });

  await expect(runCheck()).rejects.toMatchObject({
    stderr: expect.stringContaining(
      "@webstudio-is/public (packages/public/package.json) lists private workspace package @webstudio-is/private in dependencies"
    ),
  });
});
