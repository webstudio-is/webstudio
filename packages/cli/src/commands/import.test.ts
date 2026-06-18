import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const mocks = vi.hoisted(() => ({
  importProjectData: vi.fn(),
  log: {
    info: vi.fn(),
  },
  spinner: {
    start: vi.fn(),
    message: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock("@clack/prompts", () => ({
  log: mocks.log,
  spinner: () => mocks.spinner,
}));

vi.mock("@webstudio-is/http-client", () => ({
  importProjectData: mocks.importProjectData,
  syncDataVersion: 1,
  parseBuilderUrl: (urlStr: string) => {
    const url = new URL(urlStr);
    return {
      projectId: url.hostname.slice(2).split("-dot-")[0],
      sourceOrigin: url.origin,
    };
  },
}));

const originalCwd = process.cwd();
let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-import-"));
  process.chdir(tempDir);
  await mkdir(".webstudio", { recursive: true });
  mocks.importProjectData.mockResolvedValue({ version: 1 });
  mocks.log.info.mockClear();
  mocks.spinner.start.mockClear();
  mocks.spinner.message.mockClear();
  mocks.spinner.stop.mockClear();
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

test("imports local synced data into destination project", async () => {
  const destinationProjectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
  const data = {
    syncDataVersion: 1,
    build: { id: "build-1" },
    assets: [],
  };
  await writeFile(".webstudio/data.json", JSON.stringify(data), "utf8");

  const { importProject } = await import("./import");
  await importProject({
    to: `https://p-${destinationProjectId}-dot-example.com/?authToken=token-1`,
  });

  expect(mocks.importProjectData).toHaveBeenCalledWith({
    projectId: destinationProjectId,
    authToken: "token-1",
    origin: `https://p-${destinationProjectId}-dot-example.com`,
    data,
    headers: expect.objectContaining({
      "x-webstudio-client": "cli",
    }),
  });
  expect(mocks.spinner.stop).toHaveBeenCalledWith(
    "Project data imported successfully"
  );
  expect(mocks.spinner.message).toHaveBeenCalledWith(
    "Reading .webstudio/data.json"
  );
  expect(mocks.log.info).toHaveBeenCalledWith("Read .webstudio/data.json");
  expect(mocks.log.info).toHaveBeenCalledWith(
    `Destination project: ${destinationProjectId}`
  );
  expect(mocks.log.info).toHaveBeenCalledWith(
    `Destination origin: https://p-${destinationProjectId}-dot-example.com`
  );
  expect(mocks.spinner.message).toHaveBeenCalledWith(
    `Waiting for API response while importing into ${destinationProjectId}`
  );
});

test("stops with sync instruction when local data is missing", async () => {
  const destinationProjectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
  const { importProject } = await import("./import");
  await importProject({
    to: `https://p-${destinationProjectId}-dot-example.com/?authToken=token-1`,
  });

  expect(mocks.importProjectData).not.toHaveBeenCalled();
  expect(mocks.spinner.stop).toHaveBeenCalledWith(
    "Project data is missing. Please run webstudio sync before importing.",
    2
  );
});

test("stops before API request when local data is from old format", async () => {
  await writeFile(
    ".webstudio/data.json",
    JSON.stringify({ build: { id: "build-1" }, assets: [] }),
    "utf8"
  );

  const destinationProjectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
  const { importProject } = await import("./import");
  await importProject({
    to: `https://p-${destinationProjectId}-dot-example.com/?authToken=token-1`,
  });

  expect(mocks.importProjectData).not.toHaveBeenCalled();
  expect(mocks.spinner.stop).toHaveBeenCalledWith(
    "Synced project data format is incompatible. Expected version 1, received missing. Please run webstudio sync again and retry the import.",
    2
  );
});
