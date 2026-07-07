import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import makeCLI from "yargs";
import { bundleVersion } from "@webstudio-is/protocol";
import {
  createImageAssetFixture,
  createPublishedProjectBundleFixture,
} from "@webstudio-is/protocol/fixtures";
import { createAuthConfigContentFromBundle } from "../auth-config";
import { loadJSONFile } from "../fs-utils";
import { importOptions, importProject } from "./import";
import type { CommonYargsArgv } from "./yargs-types";

const originalCwd = process.cwd();
let tempDir: string;
const destinationProjectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const destinationShareLink = `https://p-${destinationProjectId}-dot-example.com/?authToken=token-1`;
const imageAsset = createImageAssetFixture({
  name: "image.png",
  size: 5,
  meta: { width: 1, height: 1 },
});
const log = {
  info: vi.fn(),
};
const indicator = {
  start: vi.fn(),
  message: vi.fn(),
  stop: vi.fn(),
};
const importProjectBundleWithAssets = vi.fn();
const readFile = vi.fn();
const promptText = vi.fn();
const dependencies = {
  importProjectBundleWithAssets,
  loadJSONFile,
  readFile,
  text: promptText,
  isInteractive: false,
  log,
  spinner: () => indicator,
};

const createSyncedData = (data = {}) =>
  createPublishedProjectBundleFixture({
    assets: [],
    projectDomain: "example.com",
    ...data,
  });

const writeSyncedData = async (data = {}) => {
  const syncedData = createSyncedData(data);
  await writeFile(".webstudio/data.json", JSON.stringify(syncedData), "utf8");
  return syncedData;
};

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-import-"));
  process.chdir(tempDir);
  await mkdir(".webstudio", { recursive: true });
  importProjectBundleWithAssets.mockResolvedValue({ version: 1 });
  readFile.mockResolvedValue(Buffer.from("asset data"));
  promptText.mockResolvedValue(destinationShareLink);
  importProjectBundleWithAssets.mockClear();
  readFile.mockClear();
  promptText.mockClear();
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
  const syncedData = await writeSyncedData();

  await importProject({ to: destinationShareLink }, dependencies);

  expect(importProjectBundleWithAssets).toHaveBeenCalledWith(
    expect.objectContaining({
      projectId: destinationProjectId,
      authToken: "token-1",
      origin: "https://example.com",
      data: syncedData,
      ignoreVersionCheck: undefined,
      readAssetData: expect.any(Function),
      headers: expect.objectContaining({ "x-webstudio-client": "cli" }),
    })
  );
  expect(indicator.message).toHaveBeenCalledWith(
    "Reading .webstudio/data.json"
  );
  expect(log.info).toHaveBeenCalledWith("Read .webstudio/data.json");
  expect(indicator.stop).toHaveBeenCalledWith("Project imported successfully");
});

test("uses configured asset directory when reading local asset files", async () => {
  await writeSyncedData({ assets: [imageAsset] });

  await importProject(
    { to: destinationShareLink, assetsDir: "custom-assets" },
    dependencies
  );

  const call = importProjectBundleWithAssets.mock.calls[0]?.[0];
  await call.readAssetData(imageAsset);

  expect(readFile).toHaveBeenCalledWith(
    expect.stringContaining("custom-assets/image.png")
  );
});

test("passes skip-assets to http client", async () => {
  await writeSyncedData({ assets: [imageAsset] });

  await importProject(
    { to: destinationShareLink, skipAssets: true },
    dependencies
  );

  expect(importProjectBundleWithAssets).toHaveBeenCalledWith(
    expect.objectContaining({
      skipAssets: true,
    })
  );
  expect(
    importProjectBundleWithAssets.mock.calls[0]?.[0].readAssetData
  ).toBeUndefined();
  expect(log.info).toHaveBeenCalledWith("Skipped asset upload and asset rows");
});

test("prompts for destination share link when running interactively", async () => {
  await writeSyncedData();

  await importProject(
    {},
    {
      ...dependencies,
      isInteractive: true,
    }
  );

  expect(promptText).toHaveBeenCalledWith({
    message: "Please paste a destination share link with build permissions",
    validate: expect.any(Function),
  });
  expect(importProjectBundleWithAssets).toHaveBeenCalledWith(
    expect.objectContaining({
      projectId: destinationProjectId,
    })
  );
});

test("stops when destination share link is missing in non-interactive mode", async () => {
  const loadJSONFile = vi.fn();

  await expect(
    importProject(
      {},
      {
        ...dependencies,
        loadJSONFile,
      }
    )
  ).rejects.toThrow("Handled CLI error");

  expect(loadJSONFile).not.toHaveBeenCalled();
  expect(importProjectBundleWithAssets).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Please specify a destination share link with --to",
    2
  );
});

test("requires destination share link before running non-interactive command", async () => {
  const parser = importOptions(
    makeCLI([])
      .exitProcess(false)
      .fail((message, error) => {
        throw error ?? new Error(message);
      }) as CommonYargsArgv
  );

  expect(() => parser.parse([])).toThrow(
    "Please specify a destination share link with --to"
  );
});

test("stops with sync instruction when local data is missing", async () => {
  await expect(
    importProject({ to: destinationShareLink }, dependencies)
  ).rejects.toThrow("Handled CLI error");

  expect(importProjectBundleWithAssets).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project bundle is missing. Please run webstudio sync before importing.",
    2
  );
});

test("stops before API request when local data is from old format", async () => {
  await writeSyncedData({ bundleVersion: undefined });

  await expect(
    importProject({ to: destinationShareLink }, dependencies)
  ).rejects.toThrow("Handled CLI error");

  expect(importProjectBundleWithAssets).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    `Project bundle format is incompatible. Expected version ${bundleVersion}, received missing. Sync with a compatible API/CLI version and retry, or pass --ignore-version-check if you know the source and target data formats are compatible.`,
    2
  );
});

test("validates exported auth config before importing", async () => {
  const syncedData = await writeSyncedData();
  await writeFile(
    ".webstudio/auth.json",
    createAuthConfigContentFromBundle(syncedData),
    "utf8"
  );

  await importProject({ to: destinationShareLink }, dependencies);

  expect(importProjectBundleWithAssets).toHaveBeenCalledWith(
    expect.objectContaining({
      data: syncedData,
    })
  );
  expect(log.info).toHaveBeenCalledWith("Read .webstudio/auth.json");
});

test("stops before API request when destination link is invalid", async () => {
  await writeSyncedData();

  await expect(
    importProject({ to: "https://example.com" }, dependencies)
  ).rejects.toThrow("Handled CLI error");

  expect(importProjectBundleWithAssets).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Destination share link is invalid.",
    2
  );
});

test("forwards import errors through the spinner", async () => {
  await writeSyncedData();
  importProjectBundleWithAssets.mockRejectedValue(
    new Error("Version mismatch")
  );

  await expect(
    importProject({ to: destinationShareLink }, dependencies)
  ).rejects.toThrow("Handled CLI error");

  expect(indicator.stop).toHaveBeenCalledWith(
    expect.stringContaining("Version mismatch"),
    2
  );
});
