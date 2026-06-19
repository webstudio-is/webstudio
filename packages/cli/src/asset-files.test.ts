import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Asset } from "@webstudio-is/sdk";
import { getLocalAssetPath, materializeAssetFile } from "./asset-files";

const originalCwd = process.cwd();
let tempDir: string;

const asset = {
  id: "asset-1",
  projectId: "project-1",
  name: "image.png",
  type: "image",
  createdAt: "2024-01-01T00:00:00.000Z",
  format: "png",
  size: 6,
  meta: { width: 1, height: 1 },
} satisfies Asset;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-assets-"));
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

test("rejects asset paths outside the asset directory", () => {
  expect(() => getLocalAssetPath("../image.png")).toThrow(
    "Asset path escapes .webstudio/assets"
  );
});

test("materializes asset files from the synced asset cache before fetching", async () => {
  await mkdir(".webstudio/assets", { recursive: true });
  await writeFile(".webstudio/assets/image.png", "synced", "utf8");
  const fetch = vi.fn();
  globalThis.fetch = fetch;

  await materializeAssetFile({
    asset,
    origin: "https://example.com",
    targetAssetsDirectory: "public/assets",
  });

  await expect(readFile("public/assets/image.png", "utf8")).resolves.toBe(
    "synced"
  );
  expect(fetch).not.toHaveBeenCalled();
});

test("downloads asset files when they are missing from the synced asset cache", async () => {
  const fetch = vi.fn(async () => new Response("downloaded"));
  globalThis.fetch = fetch;

  await materializeAssetFile({
    asset,
    origin: "https://example.com",
    targetAssetsDirectory: "public/assets",
  });

  await expect(readFile("public/assets/image.png", "utf8")).resolves.toBe(
    "downloaded"
  );
  expect(fetch).toHaveBeenCalledWith(
    "https://example.com/cgi/image/image.png?format=raw"
  );
});
