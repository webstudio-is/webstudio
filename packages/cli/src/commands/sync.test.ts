import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { SyncedProjectData } from "@webstudio-is/api-contract";
import { createFileIfNotExists, isFileExists } from "../fs-utils";
import { sync } from "./sync";

const originalCwd = process.cwd();
let tempDir: string;
const indicator = {
  start: vi.fn(),
  message: vi.fn(),
  stop: vi.fn(),
};
const loadProjectDataByBuildId = vi.fn();
const loadProjectDataByProjectId = vi.fn();
const downloadAssetFiles = vi.fn();
const dependencies = {
  createFileIfNotExists,
  downloadAssetFiles,
  isFileExists,
  loadProjectDataByBuildId,
  loadProjectDataByProjectId,
  readFile,
  spinner: () => indicator,
  writeFile,
};

const createProjectData = (data: Partial<SyncedProjectData> = {}) =>
  ({
    build: { id: "build-1" },
    assets: [],
    ...data,
  }) as SyncedProjectData;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-sync-"));
  process.chdir(tempDir);
  loadProjectDataByBuildId.mockResolvedValue(createProjectData());
  loadProjectDataByProjectId.mockResolvedValue(createProjectData());
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

test("preserves synced data without stamping a missing version", async () => {
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
  });
  expect(data.syncDataVersion).toBeUndefined();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project data synchronized successfully"
  );
});

test("downloads synchronized asset files into local project data", async () => {
  const assets = [
    {
      id: "asset-1",
      name: "image.png",
      type: "image",
      projectId: "source-project",
      createdAt: "2024-01-01T00:00:00.000Z",
      format: "png",
      size: 100,
      meta: { width: 100, height: 100 },
    },
  ] as SyncedProjectData["assets"];
  loadProjectDataByBuildId.mockResolvedValue(createProjectData({ assets }));

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

test("does not write local data when synchronized asset download fails", async () => {
  const assets = [
    {
      id: "asset-1",
      name: "image.png",
      type: "image",
      projectId: "source-project",
      createdAt: "2024-01-01T00:00:00.000Z",
      format: "png",
      size: 100,
      meta: { width: 100, height: 100 },
    },
  ] as SyncedProjectData["assets"];
  loadProjectDataByBuildId.mockResolvedValue(createProjectData({ assets }));
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
