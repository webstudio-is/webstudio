import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApiCompatibilityPayload } from "@webstudio-is/trpc-interface/api-compatibility";
import { syncDataVersion } from "@webstudio-is/api-contract";
import { loadJSONFile } from "../fs-utils";
import { loadAssetFiles } from "../asset-files";
import { importProject } from "./import";

const originalCwd = process.cwd();
let tempDir: string;
const destinationProjectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const destinationShareLink = `https://p-${destinationProjectId}-dot-example.com/?authToken=token-1`;
const log = {
  info: vi.fn(),
};
const indicator = {
  start: vi.fn(),
  message: vi.fn(),
  stop: vi.fn(),
};
const importProjectData = vi.fn();
const dependencies = {
  importProjectData,
  loadAssetFiles,
  loadJSONFile,
  log,
  spinner: () => indicator,
};

const writeSyncedData = async (data = {}) => {
  await writeFile(
    ".webstudio/data.json",
    JSON.stringify({
      syncDataVersion,
      build: { id: "build-1" },
      assets: [],
      ...data,
    }),
    "utf8"
  );
};

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-import-"));
  process.chdir(tempDir);
  await mkdir(".webstudio", { recursive: true });
  importProjectData.mockResolvedValue({ version: 1 });
  log.info.mockClear();
  indicator.start.mockClear();
  indicator.message.mockClear();
  indicator.stop.mockClear();
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

test("imports local synced data into destination project", async () => {
  await writeSyncedData();

  await importProject({ to: destinationShareLink }, dependencies);

  expect(importProjectData).toHaveBeenCalledWith({
    projectId: destinationProjectId,
    authToken: "token-1",
    origin: "https://example.com",
    data: {
      syncDataVersion,
      build: { id: "build-1" },
      assets: [],
    },
    assetFiles: [],
    ignoreVersionCheck: undefined,
    headers: expect.objectContaining({
      "x-webstudio-client": "cli",
    }),
  });
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project data imported successfully"
  );
  expect(indicator.message).toHaveBeenCalledWith(
    "Reading .webstudio/data.json"
  );
  expect(log.info).toHaveBeenCalledWith("Read .webstudio/data.json");
  expect(log.info).toHaveBeenCalledWith(
    `Destination project: ${destinationProjectId}`
  );
  expect(log.info).toHaveBeenCalledWith(
    "Destination origin: https://example.com"
  );
  expect(indicator.message).toHaveBeenCalledWith(
    `Waiting for API response while importing into ${destinationProjectId}`
  );
});

test("stops with sync instruction when local data is missing", async () => {
  await expect(
    importProject(
      {
        to: destinationShareLink,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(importProjectData).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project data is missing. Please run webstudio sync before importing.",
    2
  );
});

test("stops before API request when local data is from old format", async () => {
  await writeSyncedData({ syncDataVersion: undefined });

  await expect(
    importProject(
      {
        to: destinationShareLink,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(importProjectData).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    `Synced project data format is incompatible. Expected version ${syncDataVersion}, received missing. Sync with a compatible API/CLI version and retry, or pass --ignore-version-check if you know the source and target data formats are compatible.`,
    2
  );
});

test("imports old local data when version check is explicitly ignored", async () => {
  await writeSyncedData({ syncDataVersion: undefined });

  await importProject(
    {
      to: destinationShareLink,
      ignoreVersionCheck: true,
    },
    dependencies
  );

  expect(importProjectData).toHaveBeenCalledWith(
    expect.objectContaining({
      ignoreVersionCheck: true,
      data: {
        build: { id: "build-1" },
        assets: [],
      },
      assetFiles: [],
    })
  );
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project data imported successfully"
  );
});

test("passes version-check bypass to target API", async () => {
  await writeSyncedData();

  await importProject(
    {
      to: destinationShareLink,
      ignoreVersionCheck: true,
    },
    dependencies
  );

  expect(importProjectData).toHaveBeenCalledWith(
    expect.objectContaining({
      ignoreVersionCheck: true,
    })
  );
});

test("loads local asset files for import", async () => {
  await mkdir(".webstudio/assets", { recursive: true });
  await writeSyncedData({
    assets: [
      {
        id: "asset-1",
        projectId: "source-project",
        name: "image.png",
        type: "image",
        createdAt: "2024-01-01T00:00:00.000Z",
        format: "png",
        size: 5,
        meta: { width: 1, height: 1 },
      },
    ],
  });
  await writeFile(".webstudio/assets/image.png", "hello", "utf8");

  await importProject({ to: destinationShareLink }, dependencies);

  expect(importProjectData).toHaveBeenCalledWith(
    expect.objectContaining({
      assetFiles: [{ name: "image.png", data: "aGVsbG8=" }],
    })
  );
});

test("stops before API request when destination link is invalid", async () => {
  await writeSyncedData();

  await expect(
    importProject(
      {
        to: "https://example.com",
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(importProjectData).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Destination share link is invalid.",
    2
  );
});

test("prints import command in CLI compatibility guidance", async () => {
  await writeSyncedData();
  importProjectData.mockRejectedValue(
    new Error("Version mismatch", {
      cause: createApiCompatibilityPayload({
        reason: "apiProcedureNotFound",
        target: "cli",
      }),
    })
  );

  await expect(
    importProject(
      {
        to: destinationShareLink,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(indicator.stop).toHaveBeenCalledWith(
    expect.stringContaining("npx webstudio@latest import"),
    2
  );
});
