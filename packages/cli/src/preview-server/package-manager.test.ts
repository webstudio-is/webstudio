import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { getPackageManagerInvocation } from "./package-manager";
import {
  readWindowsPackageFile,
  resolveWindowsLauncherPath,
} from "./test-utils";

test("reuses the npm cli that launched webstudio for preview commands", () => {
  expect(
    getPackageManagerInvocation(["run", "build"], {
      nodeExecPath: "C:\\Program Files\\nodejs\\node.exe",
      npmExecPath:
        "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      platform: "win32",
      readPackageFile: readWindowsPackageFile,
      resolveLauncherPath: resolveWindowsLauncherPath,
    })
  ).toEqual({
    command: "C:\\Program Files\\nodejs\\node.exe",
    args: [
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      "run",
      "build",
    ],
  });
});

test("uses npm-cli when webstudio was launched through npx on windows", () => {
  expect(
    getPackageManagerInvocation(["run", "build"], {
      nodeExecPath: "C:\\Program Files\\nodejs\\node.exe",
      npmExecPath:
        "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
      platform: "win32",
      readPackageFile: readWindowsPackageFile,
      resolveLauncherPath: resolveWindowsLauncherPath,
    })
  ).toEqual({
    command: "C:\\Program Files\\nodejs\\node.exe",
    args: [
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      "run",
      "build",
    ],
  });
});

test("detects pnpm from the launcher's owning package metadata", () => {
  expect(
    getPackageManagerInvocation(["run", "build"], {
      nodeExecPath: "C:\\Program Files\\Codex\\node.exe",
      npmExecPath:
        "C:\\Program Files\\Codex\\node_modules\\bundled-manager\\bin\\launcher.cjs",
      platform: "win32",
      readPackageFile: (path) => {
        if (path.endsWith("node_modules\\bundled-manager\\package.json")) {
          return JSON.stringify({
            name: "pnpm",
            bin: { pnpm: "bin/launcher.cjs" },
          });
        }
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      },
      resolveLauncherPath: resolveWindowsLauncherPath,
    })
  ).toEqual({
    command: "C:\\Program Files\\Codex\\node.exe",
    args: [
      "C:\\Program Files\\Codex\\node_modules\\bundled-manager\\bin\\launcher.cjs",
      "run",
      "build",
    ],
  });
});

test.skipIf(process.platform === "win32")(
  "detects pnpm through a package-owned launcher symlink",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "webstudio-pnpm-launcher-"));
    const packageDirectory = join(directory, "node_modules", "corepack");
    const launcher = join(packageDirectory, "dist", "pnpm.js");
    const shim = join(directory, "bin", "pnpm");
    try {
      await mkdir(join(packageDirectory, "dist"), { recursive: true });
      await mkdir(join(directory, "bin"));
      await writeFile(
        join(packageDirectory, "package.json"),
        JSON.stringify({
          name: "corepack",
          bin: { pnpm: "dist/pnpm.js", yarn: "dist/yarn.js" },
        })
      );
      await writeFile(launcher, "#!/usr/bin/env node\n");
      await symlink(launcher, shim);

      expect(
        getPackageManagerInvocation(["run", "build"], {
          nodeExecPath: process.execPath,
          npmExecPath: shim,
          platform: process.platform,
        })
      ).toEqual({ command: shim, args: ["run", "build"] });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
);

test("rejects a detected package manager without preview support", () => {
  expect(() =>
    getPackageManagerInvocation(["run", "build"], {
      nodeExecPath: "C:\\Program Files\\Codex\\node.exe",
      npmExecPath: "C:\\Program Files\\Codex\\node_modules\\yarn\\bin\\yarn.js",
      platform: "win32",
      readPackageFile: () =>
        JSON.stringify({ name: "yarn", bin: { yarn: "bin/yarn.js" } }),
      resolveLauncherPath: resolveWindowsLauncherPath,
    })
  ).toThrow(
    "PREVIEW_PACKAGE_MANAGER_UNSUPPORTED: Preview supports npm and pnpm"
  );
});

test("uses npm-cli when windows npm launcher metadata is unavailable", () => {
  expect(
    getPackageManagerInvocation(["run", "build"], {
      nodeExecPath: "C:\\Program Files\\nodejs\\node.exe",
      npmExecPath: undefined,
      platform: "win32",
    })
  ).toEqual({
    command: "C:\\Program Files\\nodejs\\node.exe",
    args: [
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
      "run",
      "build",
    ],
  });
});
