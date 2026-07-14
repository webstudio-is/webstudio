import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bundleVersion } from "@webstudio-is/protocol";
import {
  createImageAssetFixture,
  createPublishedProjectBundleFixture,
} from "@webstudio-is/protocol/fixtures";
import { createFileIfNotExists, isFileExists } from "../fs-utils";
import { resolveApiConnection } from "../api-connection";
import { sync } from "./sync";
import { apiCompatibilityHeaders } from "./api";
import { materializeManagedAgents } from "../managed-agents";

const originalCwd = process.cwd();
let tempDir: string;
const indicator = {
  start: vi.fn(),
  message: vi.fn(),
  stop: vi.fn(),
};
const loadProjectBundleByBuildId = vi.fn();
const loadProjectBundleByProjectId = vi.fn();
const downloadAssetFiles = vi.fn();
const dependencies = {
  createFileIfNotExists,
  downloadAssetFiles,
  isFileExists,
  loadProjectBundleByBuildId,
  loadProjectBundleByProjectId,
  readFile,
  resolveApiConnection,
  spinner: () => indicator,
  writeFile,
  materializeManagedAgents,
};

type ProjectBundleFixtureOptions = Parameters<
  typeof createPublishedProjectBundleFixture
>[0];

const createProjectBundle = (data: ProjectBundleFixtureOptions = {}) =>
  createPublishedProjectBundleFixture(data);

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-sync-"));
  process.chdir(tempDir);
  loadProjectBundleByBuildId.mockResolvedValue(createProjectBundle());
  loadProjectBundleByProjectId.mockResolvedValue(createProjectBundle());
  downloadAssetFiles.mockResolvedValue(undefined);
  indicator.start.mockClear();
  indicator.message.mockClear();
  indicator.stop.mockClear();
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

test("writes current data version after synchronizing from the API", async () => {
  loadProjectBundleByBuildId.mockResolvedValue(
    createProjectBundle({ bundleVersion: "bundle-old" })
  );

  await sync(
    {
      authToken: "token-1",
      buildId: "build-1",
      origin: "https://example.com",
    },
    dependencies
  );

  const data = JSON.parse(await readFile(".webstudio/data.json", "utf8"));

  expect(data).toMatchObject({
    build: { id: "build-1" },
    origin: "https://example.com",
    bundleVersion,
  });
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project bundle synchronized successfully (AGENTS.md: unchanged). Next: webstudio connect"
  );
});

test("materializes project agent instructions during sync", async () => {
  loadProjectBundleByBuildId.mockResolvedValue(
    createProjectBundle({
      build: {
        projectSettings: {
          meta: { agentInstructions: "Use existing design tokens." },
          compiler: {},
        },
      },
    })
  );

  await sync(
    {
      authToken: "token-1",
      buildId: "build-1",
      origin: "https://example.com",
    },
    dependencies
  );

  expect(await readFile("AGENTS.md", "utf8")).toContain(
    "Use existing design tokens."
  );
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project bundle synchronized successfully (AGENTS.md: created). Next: webstudio connect"
  );
});

test("reports a user-owned AGENTS.md conflict without overwriting it", async () => {
  await writeFile("AGENTS.md", "# User-owned\n", "utf8");
  loadProjectBundleByBuildId.mockResolvedValue(
    createProjectBundle({
      build: {
        projectSettings: {
          meta: { agentInstructions: "Use existing design tokens." },
          compiler: {},
        },
      },
    })
  );

  await sync(
    {
      authToken: "token-1",
      buildId: "build-1",
      origin: "https://example.com",
    },
    dependencies
  );

  expect(await readFile("AGENTS.md", "utf8")).toBe("# User-owned\n");
  expect(indicator.stop).toHaveBeenCalledWith(
    expect.stringContaining("AGENTS.md blocked by user-owned file")
  );
});

test("adds current bundle version when synchronizing data from old API", async () => {
  loadProjectBundleByBuildId.mockResolvedValue(
    createProjectBundle({
      bundleVersion: undefined,
      build: {
        styles: [
          [
            "style-1",
            {
              breakpointId: "breakpoint-1",
              styleSourceId: "style-source-1",
              property: "display",
              value: { type: "keyword", value: "block" },
            },
          ],
        ],
      },
    })
  );

  await sync(
    {
      authToken: "token-1",
      buildId: "build-1",
      origin: "https://example.com",
    },
    dependencies
  );

  const data = await readFile(".webstudio/data.json", "utf8");

  expect(JSON.parse(data)).toMatchObject({ bundleVersion });
  expect(data.startsWith(`{\n  "bundleVersion":`)).toBe(true);
  expect(data.indexOf(`"build"`)).toBeLessThan(data.indexOf(`"page"`));
  expect(data.indexOf(`"styleSourceId"`)).toBeLessThan(
    data.indexOf(`"breakpointId"`)
  );
});

test("downloads project bundle asset files into local project bundle", async () => {
  const assets = [createImageAssetFixture()];
  loadProjectBundleByBuildId.mockResolvedValue(createProjectBundle({ assets }));

  await sync(
    {
      authToken: "token-1",
      buildId: "build-1",
      origin: "https://example.com",
    },
    dependencies
  );

  expect(downloadAssetFiles).toHaveBeenCalledWith({
    assets,
    origin: "https://example.com",
  });
  expect(indicator.message).toHaveBeenCalledWith("Downloading 1 asset files");
});

test("sends linked share token when synchronizing by build id", async () => {
  const resolveApiConnection = vi.fn(async () => ({
    authToken: "share-token",
    origin: "https://example.com",
    projectId: "project-id",
  }));

  await sync(
    {
      buildId: "build-1",
    },
    {
      ...dependencies,
      resolveApiConnection,
    }
  );

  expect(loadProjectBundleByBuildId).toHaveBeenCalledWith({
    buildId: "build-1",
    authToken: "share-token",
    origin: "https://example.com",
    headers: apiCompatibilityHeaders,
  });
});

test("explains unpublished project bundle errors when synchronizing linked project", async () => {
  loadProjectBundleByProjectId.mockRejectedValue(
    Object.assign(new Error("Not published"), {
      data: { code: "NOT_FOUND", webstudioCode: "PROJECT_NOT_PUBLISHED" },
    })
  );
  const resolveApiConnection = vi.fn(async () => ({
    authToken: "share-token",
    origin: "https://example.com",
    projectId: "project-id",
  }));

  await expect(
    sync({}, { ...dependencies, resolveApiConnection })
  ).rejects.toThrow("Handled CLI error");

  expect(indicator.stop).toHaveBeenCalledWith(
    [
      "Unable to synchronize project bundle because the project is not published.",
      "`webstudio sync` downloads the published project bundle.",
      "For visual verification of current MCP/API edits, use `preview.start` or `webstudio preview --source session` instead.",
    ].join("\n"),
    2
  );
});

test("explains unpublished project bundle errors when synchronizing by build id", async () => {
  loadProjectBundleByBuildId.mockRejectedValue(
    Object.assign(new Error("Not published"), {
      data: { code: "NOT_FOUND", webstudioCode: "PROJECT_NOT_PUBLISHED" },
    })
  );

  await expect(
    sync(
      {
        authToken: "token-1",
        buildId: "build-1",
        origin: "https://example.com",
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(indicator.stop).toHaveBeenCalledWith(
    [
      "Unable to synchronize project bundle because the project is not published.",
      "`webstudio sync` downloads the published project bundle.",
      "For visual verification of current MCP/API edits, use `preview.start` or `webstudio preview --source session` instead.",
    ].join("\n"),
    2
  );
});

test("does not write local data when synchronized asset download fails", async () => {
  const assets = [createImageAssetFixture()];
  loadProjectBundleByBuildId.mockResolvedValue(createProjectBundle({ assets }));
  downloadAssetFiles.mockRejectedValue(new Error("download failed"));

  await expect(
    sync(
      {
        authToken: "token-1",
        buildId: "build-1",
        origin: "https://example.com",
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  await expect(access(".webstudio/data.json")).rejects.toThrow();
  expect(indicator.stop).toHaveBeenCalledWith("download failed", 2);
});

test("throws handled error when local project config is missing", async () => {
  await expect(
    sync(
      {},
      {
        ...dependencies,
        readFile: vi.fn(async () => "{}") as unknown as typeof readFile,
      }
    )
  ).rejects.toThrow("Handled CLI error");

  expect(indicator.stop).toHaveBeenCalledWith(
    "Local config file is not found. Please make sure current directory is a webstudio project",
    2
  );
});
