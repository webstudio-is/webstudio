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
  getLocalAssetPath,
  materializeAssetFile,
  uploadAssetFiles,
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

const otherAsset = {
  ...asset,
  id: "asset-2",
  name: "other.png",
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

test("uploads assets as binary requests", async () => {
  await mkdir(".webstudio/assets", { recursive: true });
  await writeFile(".webstudio/assets/image.png", "synced", "utf8");
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      })
  );
  globalThis.fetch = fetch;

  await uploadAssetFiles({
    assets: [asset],
    authToken: "token",
    origin: "https://apps.webstudio.is",
    projectId: "project-1",
  });

  expect(fetch).toHaveBeenCalledOnce();
  const [, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
  expect(init.body).toBeInstanceOf(Blob);
  await expect((init.body as Blob).text()).resolves.toBe("synced");
});

test("retries failed asset uploads once", async () => {
  await mkdir(".webstudio/assets", { recursive: true });
  await writeFile(".webstudio/assets/image.png", "synced", "utf8");
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ errors: "Temporary failure" }), {
        headers: { "content-type": "application/json" },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      })
    );
  globalThis.fetch = fetch;

  await uploadAssetFiles({
    assets: [asset],
    authToken: "token",
    origin: "https://apps.webstudio.is",
    projectId: "project-1",
  });

  expect(fetch).toHaveBeenCalledTimes(2);
});

test("reports all asset uploads that fail after retry", async () => {
  await mkdir(".webstudio/assets", { recursive: true });
  await writeFile(".webstudio/assets/image.png", "synced", "utf8");
  await writeFile(".webstudio/assets/other.png", "other", "utf8");
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ errors: "Upload failed" }), {
        headers: { "content-type": "application/json" },
      })
  );
  globalThis.fetch = fetch;

  let message = "";
  try {
    await uploadAssetFiles({
      assets: [asset, otherAsset],
      authToken: "token",
      origin: "https://apps.webstudio.is",
      projectId: "project-1",
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  expect(message).toContain("Failed to upload assets:");
  expect(message).toContain("image.png: Upload failed");
  expect(message).toContain("other.png: Upload failed");
  expect(fetch).toHaveBeenCalledTimes(4);
});

test("reports missing local asset files with upload failures", async () => {
  let message = "";
  try {
    await uploadAssetFiles({
      assets: [asset],
      authToken: "token",
      origin: "https://apps.webstudio.is",
      projectId: "project-1",
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  expect(message).toContain("Failed to upload assets:");
  expect(message).toContain("image.png:");
  expect(message).toContain("no such file or directory");
});
