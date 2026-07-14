import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chdir, cwd } from "node:process";
import { expect, test, vi } from "vitest";
import { createPublishedProjectBundleFixture } from "@webstudio-is/protocol/fixtures";
import {
  ensurePreviewDependencies,
  buildPreparedPreview,
  getNodeModulesSearchPaths,
  getPreviewBuildCacheKey,
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
      source: "local",
      imageDomain: undefined,
      "image-domain": undefined,
    })
  ).rejects.toThrow("--host must not be empty.");
});

test("defaults preview generation to the app template", () => {
  expect(previewDefaultTemplate).toEqual(["defaults", "react-router"]);
});

test("uses Node module search paths to discover installed dependencies", () => {
  expect(
    getNodeModulesSearchPaths(
      "file:///tmp/app/node_modules/webstudio/lib/cli.js"
    )
  ).toContain("/tmp/app/node_modules");
});

test("builds only uncached prepared previews and records the cache key", async () => {
  const runPreviewBuild = vi.fn(async () => undefined);
  const writeFile = vi.fn(async () => undefined);

  await expect(
    buildPreparedPreview(
      {
        cwd: "/tmp/preview",
        buildCacheKey: "cache-key",
        buildRequired: true,
      },
      { runPreviewBuild, writeFile }
    )
  ).resolves.toBe(true);
  expect(runPreviewBuild).toHaveBeenCalledWith(undefined, "/tmp/preview");
  expect(writeFile).toHaveBeenCalledWith(
    "/tmp/preview/.webstudio-preview-build",
    "cache-key"
  );

  runPreviewBuild.mockClear();
  writeFile.mockClear();
  await expect(
    buildPreparedPreview(
      { cwd: "/tmp/preview", buildRequired: false },
      { runPreviewBuild, writeFile }
    )
  ).resolves.toBe(false);
  expect(runPreviewBuild).not.toHaveBeenCalled();
  expect(writeFile).not.toHaveBeenCalled();
});

test("keys packaged preview builds to project inputs and asset metadata", async () => {
  const projectDir = join(tmpdir(), `webstudio-preview-key-${randomUUID()}`);
  await mkdir(join(projectDir, ".webstudio", "assets"), { recursive: true });
  await writeFile(join(projectDir, ".webstudio", "data.json"), "first");
  await writeFile(join(projectDir, ".webstudio", "config.json"), "config");
  await writeFile(join(projectDir, ".webstudio", "assets", "hero.png"), "a");
  try {
    const first = await getPreviewBuildCacheKey({
      projectDir,
      assets: true,
      template: [],
      cliVersion: "1.2.3",
    });
    const same = await getPreviewBuildCacheKey({
      projectDir,
      assets: true,
      template: [],
      cliVersion: "1.2.3",
    });
    await writeFile(join(projectDir, ".webstudio", "data.json"), "second");
    const changed = await getPreviewBuildCacheKey({
      projectDir,
      assets: true,
      template: [],
      cliVersion: "1.2.3",
    });

    expect(first).toBe(same);
    expect(changed).not.toBe(first);
    await expect(
      getPreviewBuildCacheKey({
        projectDir,
        assets: true,
        template: [],
        cliVersion: "0.0.0-webstudio-version",
      })
    ).resolves.toBeUndefined();
  } finally {
    await rm(projectDir, { recursive: true, force: true });
  }
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
    materializeManagedAgents: vi.fn(async () => ({
      path: "/project/AGENTS.md",
      status: "unchanged" as const,
    })),
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
    ensureDependencies: vi.fn(async () => undefined),
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
  await writeFile(
    join(projectDir, ".webstudio", "project-session.json"),
    "consumer session"
  );
  await mkdir(join(projectDir, ".temp"), { recursive: true });
  await writeFile(join(projectDir, ".temp", "diagnostic.mjs"), "consumer file");
  await mkdir(join(projectDir, ".webstudio", "preview", "node_modules"), {
    recursive: true,
  });
  await writeFile(
    join(projectDir, ".webstudio", "preview", "node_modules", "cached"),
    "preserved"
  );
  const ensureDependencies = vi.fn(async (previewProjectDir: string) => {
    await expect(
      readFile(join(previewProjectDir, "node_modules", "cached"), "utf8")
    ).resolves.toBe("preserved");
  });
  chdir(projectDir);
  expectedPreviewProjectDir = getPreviewProjectDir();
  try {
    await expect(
      preparePreviewProject({
        assets: true,
        template: [],
        generate: true,
        prebuildProject,
        ensureDependencies,
      })
    ).resolves.toEqual({
      cwd: expectedPreviewProjectDir,
      buildRequired: true,
    });
    await expect(
      readFile(join(projectDir, ".webstudio", "project-session.json"), "utf8")
    ).resolves.toBe("consumer session");
    await expect(
      readFile(join(projectDir, ".temp", "diagnostic.mjs"), "utf8")
    ).resolves.toBe("consumer file");
  } finally {
    chdir(previousDirectory);
    await rm(projectDir, { recursive: true, force: true });
  }

  expect(prebuildProject).toHaveBeenCalledWith({
    assets: true,
    template: ["defaults", "react-router"],
  });
  expect(ensureDependencies).toHaveBeenCalledOnce();
});

test("revalidates dependencies when reusing a cached preview build", async () => {
  const previousDirectory = cwd();
  const projectDir = join(tmpdir(), `webstudio-preview-test-${randomUUID()}`);
  const previewProjectDir = join(projectDir, ".webstudio", "preview");
  const ensureDependencies = vi.fn(async () => undefined);
  const prebuildProject = vi.fn(async () => undefined);

  await mkdir(previewProjectDir, { recursive: true });
  await writeFile(join(projectDir, ".webstudio", "data.json"), "{}");
  await writeFile(
    join(previewProjectDir, ".webstudio-preview-build"),
    "cache-key"
  );
  chdir(projectDir);
  try {
    const result = await preparePreviewProject({
      assets: true,
      template: [],
      generate: true,
      prebuildProject,
      ensureDependencies,
      getBuildCacheKey: vi.fn(async () => "cache-key"),
    });
    expect(result.buildCacheKey).toBe("cache-key");
    expect(result.buildRequired).toBe(false);
    await expect(realpath(result.cwd)).resolves.toBe(
      await realpath(previewProjectDir)
    );
  } finally {
    chdir(previousDirectory);
    await rm(projectDir, { recursive: true, force: true });
  }

  expect(ensureDependencies).toHaveBeenCalledOnce();
  expect(prebuildProject).not.toHaveBeenCalled();
});

test("links local workspace preview dependencies without asking npm for placeholder versions", async () => {
  const symlink = vi.fn(async () => undefined);
  const cliNodeModules = getNodeModulesSearchPaths(import.meta.url).find(
    (path) => path.endsWith("/packages/cli/node_modules")
  );
  expect(cliNodeModules).toBeDefined();
  const access = vi.fn(async (path: string) => {
    if (path.startsWith(cliNodeModules!) === false) {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }
  });
  const execFile = vi.fn(async () => ({ stdout: "", stderr: "" }));

  await ensurePreviewDependencies("/tmp/project/.webstudio/preview", {
    access,
    execFile,
    lstat: vi.fn(async () => {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }),
    readFile: vi.fn(
      async () =>
        '{"dependencies":{"@webstudio-is/image":"0.0.0-webstudio-version","vite":"1.0.0"}}'
    ),
    symlink,
    platform: "linux",
  });

  expect(symlink).toHaveBeenCalledWith(
    cliNodeModules,
    "/tmp/project/.webstudio/preview/node_modules",
    "dir"
  );
  expect(execFile).not.toHaveBeenCalled();
});

test("does not relink generated preview dependencies when already present", async () => {
  const symlink = vi.fn(async () => undefined);
  const access = vi.fn(async () => undefined);

  await ensurePreviewDependencies("/tmp/project/.webstudio/preview", {
    access,
    lstat: vi.fn(async () => ({ isSymbolicLink: () => true })) as never,
    readFile: vi.fn(async () => '{"dependencies":{"vite":"1.0.0"}}'),
    symlink,
    platform: "linux",
  });

  expect(symlink).not.toHaveBeenCalled();
});

test("uses junctions for generated preview dependencies on windows", async () => {
  const symlink = vi.fn(async () => undefined);
  const cliNodeModules = getNodeModulesSearchPaths(import.meta.url).find(
    (path) => path.endsWith("/packages/cli/node_modules")
  );
  expect(cliNodeModules).toBeDefined();
  const access = vi.fn(async (path: string) => {
    if (path.startsWith(cliNodeModules!) === false) {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }
  });

  await ensurePreviewDependencies("C:/project/.webstudio/preview", {
    access,
    lstat: vi.fn(async () => {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }),
    readFile: vi.fn(async () => '{"dependencies":{"vite":"1.0.0"}}'),
    symlink,
    platform: "win32",
  });

  expect(symlink).toHaveBeenCalledWith(
    cliNodeModules,
    "C:/project/.webstudio/preview/node_modules",
    "junction"
  );
});

test("installs isolated generated dependencies when the cli does not ship them", async () => {
  let installed = false;
  const execFile = vi.fn(async () => {
    installed = true;
    return { stdout: "", stderr: "" };
  });
  const writeFile = vi.fn(async () => undefined);

  await ensurePreviewDependencies("/tmp/project/.webstudio/preview", {
    access: vi.fn(async (path) => {
      if (installed && path.startsWith("/tmp/project/.webstudio/preview")) {
        return;
      }
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }),
    execFile,
    lstat: vi.fn(async () => {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }),
    readFile: vi.fn(async () => '{"dependencies":{"vite":"1.0.0"}}'),
    writeFile,
    platform: "linux",
  });

  expect(execFile).toHaveBeenCalledWith(
    "npm",
    expect.arrayContaining(["install", "--legacy-peer-deps"]),
    { cwd: "/tmp/project/.webstudio/preview" }
  );
  expect(writeFile).toHaveBeenCalledWith(
    "/tmp/project/.webstudio/preview/node_modules/.webstudio-preview-dependencies",
    expect.stringMatching(/^[a-f0-9]{64}$/)
  );
});

test("reports an actionable error when generated dependencies cannot install", async () => {
  const access = vi.fn(async () => {
    throw Object.assign(new Error("missing"), { code: "ENOENT" });
  });

  await expect(
    ensurePreviewDependencies("/tmp/project/.webstudio/preview", {
      access,
      execFile: vi.fn(async () => {
        throw new Error("npm failed");
      }),
      lstat: vi.fn(async () => {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }),
      readFile: vi.fn(async () => '{"dependencies":{"vite":"1.0.0"}}'),
      symlink: vi.fn(async () => undefined),
      platform: "linux",
    })
  ).rejects.toThrow(
    "PREVIEW_DEPENDENCY_INSTALL_FAILED: Could not install the generated preview dependencies"
  );
});

test("rejects an incomplete generated dependency tree", async () => {
  await expect(
    ensurePreviewDependencies("/tmp/project/.webstudio/preview", {
      access: vi.fn(async () => {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }),
      execFile: vi.fn(async () => ({ stdout: "", stderr: "" })),
      lstat: vi.fn(async () => {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }),
      readFile: vi.fn(async () => '{"dependencies":{"vite":"1.0.0"}}'),
      platform: "linux",
    })
  ).rejects.toThrow(
    "PREVIEW_DEPENDENCIES_MISSING: npm completed without installing every dependency"
  );
});

test("materializes session data before previewing from session source", async () => {
  const previousDirectory = cwd();
  const projectDir = join(tmpdir(), `webstudio-preview-test-${randomUUID()}`);
  let expectedPreviewProjectDir = "";
  const prepareSessionDataFile = vi.fn(async () => {
    await mkdir(join(projectDir, ".webstudio"), { recursive: true });
    await writeFile(join(projectDir, ".webstudio", "data.json"), "{}");
    await writeFile(join(projectDir, ".webstudio", "config.json"), "{}");
  });
  const prebuildProject = vi.fn(async () => {
    expect(cwd()).toBe(expectedPreviewProjectDir);
  });

  await mkdir(projectDir, { recursive: true });
  chdir(projectDir);
  expectedPreviewProjectDir = getPreviewProjectDir();
  try {
    await expect(
      preparePreviewProject({
        assets: true,
        template: [],
        generate: true,
        source: "session",
        prepareSessionDataFile,
        prebuildProject,
        ensureDependencies: vi.fn(async () => undefined),
      })
    ).resolves.toEqual({
      cwd: expectedPreviewProjectDir,
      buildRequired: true,
    });
  } finally {
    chdir(previousDirectory);
    await rm(projectDir, { recursive: true, force: true });
  }

  expect(prepareSessionDataFile).toHaveBeenCalledOnce();
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
    ensureDependencies: vi.fn(async () => undefined),
    accessLocalDataFile: vi.fn(async () => undefined),
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

  expect(epilogueText).toContain("isolated under .webstudio/preview");
  expect(epilogueText).toContain("reused across regenerations");
  expect(epilogueText).toContain("Do not add generated-preview dependencies");
  expect(epilogueText).toContain("check npm and network configuration");
});
