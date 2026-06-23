import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import makeCLI from "yargs";
import { createApiCompatibilityPayload } from "@webstudio-is/trpc-interface/api-compatibility";
import { bundleVersion } from "@webstudio-is/protocol";
import {
  createImageAssetFixture,
  createPublishedProjectBundleFixture,
} from "@webstudio-is/protocol/fixtures";
import { loadJSONFile } from "../fs-utils";
import {
  createAuthConfigContentFromBundle,
  LOCAL_AUTH_FILE,
} from "../auth-config";
import { importOptions, importProject } from "./import";
import type { CommonYargsArgv } from "./yargs-types";

const originalCwd = process.cwd();
let tempDir: string;
const destinationProjectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const destinationShareLink = `https://p-${destinationProjectId}-dot-example.com/?authToken=token-1`;
const destinationRequest = {
  projectId: destinationProjectId,
  authToken: "token-1",
  origin: "https://example.com",
  headers: expect.objectContaining({
    "x-webstudio-client": "cli",
  }),
};
const imageAsset = createImageAssetFixture({
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
const checkProjectBuildPermission = vi.fn();
const importProjectBundle = vi.fn();
const uploadAssetFiles = vi.fn();
const promptText = vi.fn();
const dependencies = {
  checkProjectBuildPermission,
  importProjectBundle,
  uploadAssetFiles,
  loadJSONFile,
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
  checkProjectBuildPermission.mockResolvedValue(undefined);
  importProjectBundle.mockResolvedValue({ version: 1 });
  uploadAssetFiles.mockResolvedValue(undefined);
  promptText.mockResolvedValue(destinationShareLink);
  checkProjectBuildPermission.mockClear();
  uploadAssetFiles.mockClear();
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
  await writeSyncedData();

  await importProject({ to: destinationShareLink }, dependencies);

  expect(checkProjectBuildPermission).toHaveBeenCalledWith(destinationRequest);
  expect(importProjectBundle).toHaveBeenCalledWith({
    ...destinationRequest,
    data: createSyncedData(),
    ignoreVersionCheck: undefined,
  });
  expect(indicator.stop).toHaveBeenCalledWith("Project imported successfully");
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
    "Checking destination build permission"
  );
  expect(indicator.message).toHaveBeenCalledWith(
    `Waiting for API response while importing into ${destinationProjectId}`
  );
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
  expect(checkProjectBuildPermission).toHaveBeenCalledWith(
    expect.objectContaining({
      projectId: destinationProjectId,
      authToken: "token-1",
      origin: "https://example.com",
    })
  );
  expect(importProjectBundle).toHaveBeenCalledWith(
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
  expect(promptText).not.toHaveBeenCalled();
  expect(checkProjectBuildPermission).not.toHaveBeenCalled();
  expect(importProjectBundle).not.toHaveBeenCalled();
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

test("parses skip-assets flag", async () => {
  const parser = importOptions(
    makeCLI([])
      .exitProcess(false)
      .fail((message, error) => {
        throw error ?? new Error(message);
      }) as CommonYargsArgv
  );

  expect(
    parser.parse(["--to", destinationShareLink, "--skip-assets"])
  ).toMatchObject({
    skipAssets: true,
  });
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

  expect(importProjectBundle).not.toHaveBeenCalled();
  expect(checkProjectBuildPermission).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project bundle is missing. Please run webstudio sync before importing.",
    2
  );
});

test("stops with invalid data message when local data is malformed JSON", async () => {
  await writeFile(".webstudio/data.json", "{", "utf8");

  await expect(
    importProject(
      {
        to: destinationShareLink,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(importProjectBundle).not.toHaveBeenCalled();
  expect(checkProjectBuildPermission).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project bundle is invalid. Please run webstudio sync before importing.",
    2
  );
});

test("does not prompt for destination when local data is missing", async () => {
  await expect(
    importProject(
      {},
      {
        ...dependencies,
        isInteractive: true,
      }
    )
  ).rejects.toThrow("Handled CLI error");

  expect(promptText).not.toHaveBeenCalled();
  expect(checkProjectBuildPermission).not.toHaveBeenCalled();
  expect(importProjectBundle).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project bundle is missing. Please run webstudio sync before importing.",
    2
  );
});

test("stops before API request when local data is from old format", async () => {
  await writeSyncedData({ bundleVersion: undefined });

  await expect(
    importProject(
      {
        to: destinationShareLink,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(importProjectBundle).not.toHaveBeenCalled();
  expect(checkProjectBuildPermission).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    `Project bundle format is incompatible. Expected version ${bundleVersion}, received missing. Sync with a compatible API/CLI version and retry, or pass --ignore-version-check if you know the source and target data formats are compatible.`,
    2
  );
});

test("imports old local data when version check is explicitly ignored", async () => {
  await writeSyncedData({ bundleVersion: undefined });

  await importProject(
    {
      to: destinationShareLink,
      ignoreVersionCheck: true,
    },
    dependencies
  );

  expect(importProjectBundle).toHaveBeenCalledWith(
    expect.objectContaining({
      ignoreVersionCheck: true,
      data: createSyncedData({ bundleVersion: undefined }),
    })
  );
  expect(indicator.stop).toHaveBeenCalledWith("Project imported successfully");
});

test("stops before API request when ignored-version data is missing assets", async () => {
  await writeSyncedData({
    assets: undefined,
    bundleVersion: undefined,
  });

  await expect(
    importProject(
      {
        to: destinationShareLink,
        ignoreVersionCheck: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(checkProjectBuildPermission).not.toHaveBeenCalled();
  expect(importProjectBundle).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project bundle is invalid. Please run webstudio sync before importing. Invalid fields: assets: Required",
    2
  );
});

test("stops before API request when ignored-version data is missing published metadata", async () => {
  await writeSyncedData({
    projectTitle: undefined,
    bundleVersion: undefined,
  });

  await expect(
    importProject(
      {
        to: destinationShareLink,
        ignoreVersionCheck: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(checkProjectBuildPermission).not.toHaveBeenCalled();
  expect(importProjectBundle).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project bundle is invalid. Please run webstudio sync before importing. Invalid fields: projectTitle: Required",
    2
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

  expect(importProjectBundle).toHaveBeenCalledWith(
    expect.objectContaining({
      ignoreVersionCheck: true,
    })
  );
});

test("uploads local asset files before import", async () => {
  await mkdir(".webstudio/assets", { recursive: true });
  await writeSyncedData({
    assets: [imageAsset],
  });
  await writeFile(".webstudio/assets/image.png", "hello", "utf8");

  await importProject({ to: destinationShareLink }, dependencies);

  expect(uploadAssetFiles).toHaveBeenCalledWith({
    ...destinationRequest,
    assets: [imageAsset],
  });
  expect(importProjectBundle).toHaveBeenCalledWith(
    expect.objectContaining({
      data: createSyncedData({ assets: [imageAsset] }),
    })
  );
});

test("imports without uploading assets when requested", async () => {
  await writeSyncedData({
    assets: [imageAsset],
  });

  await importProject(
    {
      to: destinationShareLink,
      skipAssets: true,
    },
    dependencies
  );

  expect(uploadAssetFiles).not.toHaveBeenCalled();
  expect(log.info).toHaveBeenCalledWith("Skipped asset upload and asset rows");
  expect(importProjectBundle).toHaveBeenCalledWith(
    expect.objectContaining({
      data: createSyncedData({ assets: [] }),
    })
  );
});

test("validates exported auth config before importing", async () => {
  const syncedData = await writeSyncedData();
  await writeFile(
    LOCAL_AUTH_FILE,
    createAuthConfigContentFromBundle(syncedData),
    "utf8"
  );

  await importProject({ to: destinationShareLink }, dependencies);

  expect(importProjectBundle).toHaveBeenCalledWith(
    expect.objectContaining({
      data: syncedData,
    })
  );
  expect(log.info).toHaveBeenCalledWith(`Read ${LOCAL_AUTH_FILE}`);
});

test("stops before API request when exported auth config is malformed", async () => {
  await writeSyncedData();
  await writeFile(LOCAL_AUTH_FILE, "{", "utf8");

  await expect(
    importProject({ to: destinationShareLink }, dependencies)
  ).rejects.toThrow("Handled CLI error");

  expect(checkProjectBuildPermission).not.toHaveBeenCalled();
  expect(importProjectBundle).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    `Project bundle auth config is invalid. Please run webstudio prebuild before importing. ${LOCAL_AUTH_FILE} is invalid JSON`,
    2
  );
});

test("stops before API request when exported auth config does not match data", async () => {
  await writeSyncedData();
  await writeFile(
    LOCAL_AUTH_FILE,
    JSON.stringify({
      version: 1,
      routes: {
        "/private": {
          method: "basic",
          login: "admin",
          password: "secret",
        },
      },
    }),
    "utf8"
  );

  await expect(
    importProject({ to: destinationShareLink }, dependencies)
  ).rejects.toThrow("Handled CLI error");

  expect(checkProjectBuildPermission).not.toHaveBeenCalled();
  expect(importProjectBundle).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    `Project bundle auth config is invalid. Please run webstudio prebuild before importing. ${LOCAL_AUTH_FILE} does not match .webstudio/data.json`,
    2
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

  expect(importProjectBundle).not.toHaveBeenCalled();
  expect(checkProjectBuildPermission).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Destination share link is invalid.",
    2
  );
});

test("stops before API request when current local data is malformed", async () => {
  await writeSyncedData({ assets: undefined });

  await expect(
    importProject(
      {
        to: destinationShareLink,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(checkProjectBuildPermission).not.toHaveBeenCalled();
  expect(importProjectBundle).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project bundle is invalid. Please run webstudio sync before importing. Invalid fields: assets: Required",
    2
  );
});

test("stops before API request when current local data is missing published metadata", async () => {
  await writeSyncedData({ projectTitle: undefined });

  await expect(
    importProject(
      {
        to: destinationShareLink,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(checkProjectBuildPermission).not.toHaveBeenCalled();
  expect(importProjectBundle).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "Project bundle is invalid. Please run webstudio sync before importing. Invalid fields: projectTitle: Required",
    2
  );
});

test("stops before uploading asset files when destination permission check fails", async () => {
  await writeSyncedData({
    assets: [imageAsset],
  });
  const uploadAssetFiles = vi.fn();
  checkProjectBuildPermission.mockRejectedValue(
    new Error("You don't have permission to build this project")
  );

  await expect(
    importProject(
      {
        to: destinationShareLink,
      },
      {
        ...dependencies,
        uploadAssetFiles,
      }
    )
  ).rejects.toThrow("Handled CLI error");

  expect(checkProjectBuildPermission).toHaveBeenCalledWith(destinationRequest);
  expect(uploadAssetFiles).not.toHaveBeenCalled();
  expect(importProjectBundle).not.toHaveBeenCalled();
  expect(indicator.stop).toHaveBeenCalledWith(
    "You don't have permission to build this project",
    2
  );
});

test("prints import command in CLI compatibility guidance", async () => {
  await writeSyncedData();
  importProjectBundle.mockRejectedValue(
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

test("forwards oversized project bundle import error", async () => {
  await writeSyncedData();
  importProjectBundle.mockRejectedValue(
    new Error("Project bundle is too large to import. Maximum size is 20 MiB.")
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
    "Project bundle is too large to import. Maximum size is 20 MiB.",
    2
  );
});
