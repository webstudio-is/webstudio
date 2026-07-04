import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chdir, cwd } from "node:process";
import { expect, test, vi } from "vitest";
import { createPublishedProjectBundleFixture } from "@webstudio-is/protocol/fixtures";
import {
  getPreviewProjectDir,
  preparePreviewProject,
  preview,
  previewDefaultTemplate,
  previewOptions,
} from "./preview";
import type { CommonYargsArgv } from "./yargs-types";

test("rejects empty preview host", async () => {
  await expect(
    preview({
      host: "",
      port: 5173,
      generate: false,
      assets: true,
      template: [],
    })
  ).rejects.toThrow("--host must not be empty.");
});

test("defaults preview generation to the app template", () => {
  expect(previewDefaultTemplate).toEqual(["defaults", "react-router"]);
});

test("prepares preview by syncing missing data and generating the app template", async () => {
  const syncDependencies = {
    createFileIfNotExists: vi.fn(async () => undefined),
    downloadAssetFiles: vi.fn(async () => undefined),
    isFileExists: vi.fn(async () => true),
    loadProjectBundleByBuildId: vi.fn(),
    loadProjectBundleByProjectId: vi.fn(async () =>
      createPublishedProjectBundleFixture()
    ),
    readFile: vi.fn(),
    resolveApiConnection: vi.fn(async () => ({
      origin: "https://example.com",
      authToken: "token",
      projectId: "project",
    })),
    spinner: vi.fn(),
    writeFile: vi.fn(async () => undefined),
  };
  const accessLocalDataFile = vi.fn(async () => {
    throw Object.assign(new Error("missing"), { code: "ENOENT" });
  });
  const prebuildProject = vi.fn(async () => undefined);

  const result = await preparePreviewProject({
    assets: true,
    template: [],
    generate: true,
    syncIfMissing: true,
    syncDependencies,
    accessLocalDataFile,
    prebuildProject,
  });

  expect(syncDependencies.loadProjectBundleByProjectId).toHaveBeenCalled();
  expect(prebuildProject).toHaveBeenCalledWith({
    assets: true,
    template: ["defaults", "react-router"],
  });
  expect(result.cwd).toBe(getPreviewProjectDir());
});

test("generates preview project in isolated directory", async () => {
  const previousDirectory = cwd();
  const projectDir = join(tmpdir(), `webstudio-preview-test-${randomUUID()}`);
  let expectedPreviewProjectDir = "";
  const prebuildProject = vi.fn(async () => {
    expect(cwd()).toBe(expectedPreviewProjectDir);
  });

  await mkdir(join(projectDir, ".webstudio"), { recursive: true });
  await writeFile(join(projectDir, ".webstudio", "data.json"), "{}");
  await writeFile(join(projectDir, ".webstudio", "config.json"), "{}");
  chdir(projectDir);
  expectedPreviewProjectDir = getPreviewProjectDir();
  try {
    await expect(
      preparePreviewProject({
        assets: true,
        template: [],
        generate: true,
        prebuildProject,
      })
    ).resolves.toEqual({ cwd: expectedPreviewProjectDir });
  } finally {
    chdir(previousDirectory);
    await rm(projectDir, { recursive: true, force: true });
  }

  expect(prebuildProject).toHaveBeenCalledWith({
    assets: true,
    template: ["defaults", "react-router"],
  });
});

test("uses current project directory when generation is disabled", async () => {
  const previousDirectory = cwd();
  const projectDir = join(tmpdir(), `webstudio-preview-test-${randomUUID()}`);
  const prebuildProject = vi.fn(async () => undefined);

  await mkdir(join(projectDir, ".webstudio"), { recursive: true });
  await writeFile(join(projectDir, ".webstudio", "data.json"), "{}");
  chdir(projectDir);
  try {
    const currentProjectDir = cwd();
    await expect(
      preparePreviewProject({
        assets: true,
        template: [],
        generate: false,
        prebuildProject,
      })
    ).resolves.toEqual({ cwd: currentProjectDir });
  } finally {
    chdir(previousDirectory);
    await rm(projectDir, { recursive: true, force: true });
  }

  expect(prebuildProject).not.toHaveBeenCalled();
});

test("adds defaults when previewing the direct React Router template", async () => {
  const prebuildProject = vi.fn(async () => undefined);

  await preparePreviewProject({
    assets: true,
    template: ["react-router"],
    generate: true,
    prebuildProject,
  });

  expect(prebuildProject).toHaveBeenCalledWith({
    assets: true,
    template: ["defaults", "react-router"],
  });
});

test("documents generated app dependency setup", () => {
  const yargs = {
    option: () => yargs,
    example: () => yargs,
    epilogue: (text: string) => {
      epilogueText = text;
      return yargs;
    },
  } as unknown as CommonYargsArgv;
  let epilogueText = "";

  previewOptions(yargs);

  expect(epilogueText).toContain("does not install app dependencies");
  expect(epilogueText).toContain("npm install or pnpm install");
  expect(epilogueText).toContain("react-router-serve");
});
