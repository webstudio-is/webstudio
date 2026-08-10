import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Asset } from "@webstudio-is/sdk";
import {
  createLocalAssetDataReader,
  createLocalUpdateAssetContentInput,
  getLocalAssetPath,
  materializeAssetFile,
} from "./asset-files";

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
  expect(() => getLocalAssetPath("folder\\image.png")).toThrow(
    "Asset path escapes .webstudio/assets"
  );
});

test("creates a local asset data reader", async () => {
  await mkdir(".webstudio/assets", { recursive: true });
  await writeFile(".webstudio/assets/image.png", "asset", "utf8");

  const readAssetData = createLocalAssetDataReader(readFile);
  const data = await readAssetData({ name: "image.png" });

  expect(
    Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString()
  ).toBe("asset");
});

test("creates asset content readers from inline content or a file", async () => {
  await writeFile("content.json", '{"source":"file"}', "utf8");
  const fromContent = createLocalUpdateAssetContentInput({
    assetId: "asset",
    expectedName: "content_old.json",
    content: '{"source":"inline"}',
    readFile,
  });
  const fromPath = createLocalUpdateAssetContentInput({
    assetId: "asset",
    expectedName: "content_old.json",
    path: "content.json",
    readFile,
  });

  await expect(fromContent.readAssetData()).resolves.toBe(
    '{"source":"inline"}'
  );
  await expect(fromPath.readAssetData()).resolves.toEqual(
    Buffer.from('{"source":"file"}')
  );
});

test("requires exactly one asset content source", () => {
  const base = {
    assetId: "asset",
    expectedName: "content_old.json",
    readFile,
  };

  expect(() => createLocalUpdateAssetContentInput(base)).toThrow(
    "requires exactly one"
  );
  expect(() =>
    createLocalUpdateAssetContentInput({
      ...base,
      path: "content.json",
      content: "content",
    })
  ).toThrow("requires exactly one");
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

test("retries asset download once after a server error", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response("failed", { status: 500 }))
    .mockResolvedValueOnce(new Response("downloaded"));
  globalThis.fetch = fetch;

  await materializeAssetFile({
    asset,
    origin: "https://example.com",
    targetAssetsDirectory: "public/assets",
  });

  await expect(readFile("public/assets/image.png", "utf8")).resolves.toBe(
    "downloaded"
  );
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("removes temporary files when asset download fails", async () => {
  const fetch = vi.fn(
    async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            controller.error(new Error("download failed"));
          },
        })
      )
  );
  globalThis.fetch = fetch;

  await expect(
    materializeAssetFile({
      asset,
      origin: "https://example.com",
      targetAssetsDirectory: "public/assets",
    })
  ).rejects.toThrow("download failed");

  await expect(access("public/assets/image.png")).rejects.toThrow();
  await expect(access("public/assets/image.png.tmp")).rejects.toThrow();
});

test("fails clearly when asset download response has no body", async () => {
  const fetch = vi.fn(async () => new Response(null));
  globalThis.fetch = fetch;

  await expect(
    materializeAssetFile({
      asset,
      origin: "https://example.com",
      targetAssetsDirectory: "public/assets",
    })
  ).rejects.toThrow("response body is empty");

  await expect(access("public/assets/image.png")).rejects.toThrow();
  await expect(access("public/assets/image.png.tmp")).rejects.toThrow();
});
