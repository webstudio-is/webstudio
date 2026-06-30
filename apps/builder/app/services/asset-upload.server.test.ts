// @vitest-environment node

import { afterEach, expect, test, vi } from "vitest";
import { RESIZABLE_IMAGE_MIME_TYPES } from "@webstudio-is/sdk";
import {
  getAssetInfoFallback,
  getBrowserAssetFormat,
  getBrowserUploadBody,
  parseAssetType,
} from "./asset-upload.server";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("keeps raw browser upload request bodies unchanged", async () => {
  const request = new Request("https://webstudio.is/rest/assets/image.png", {
    method: "POST",
    body: "raw file",
  });

  await expect(
    new Response(
      await getBrowserUploadBody(request, "application/octet-stream")
    ).text()
  ).resolves.toBe("raw file");
});

test("keeps browser JSON file uploads as JSON file content", async () => {
  const request = new Request("https://webstudio.is/rest/assets/data.json", {
    method: "POST",
    body: JSON.stringify({ value: 1 }),
    headers: { "Content-Type": "application/json" },
  });

  await expect(
    new Response(await getBrowserUploadBody(request, "application/json")).text()
  ).resolves.toBe(JSON.stringify({ value: 1 }));
});

test("keeps browser URL image uploads by fetching the remote image body", async () => {
  const fetch = vi.fn(async () => new Response("remote image"));
  vi.stubGlobal("fetch", fetch);
  const request = new Request("https://webstudio.is/rest/assets/image.png", {
    method: "POST",
    body: JSON.stringify({ url: "https://example.com/image.png" }),
    headers: { "Content-Type": "application/json" },
  });

  await expect(
    new Response(await getBrowserUploadBody(request, "application/json")).text()
  ).resolves.toBe("remote image");
  expect(fetch).toHaveBeenCalledWith("https://example.com/image.png", {
    method: "GET",
    headers: { Accept: RESIZABLE_IMAGE_MIME_TYPES.join(",") },
  });
});

test("reports browser URL image fetch failures", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("not found", { status: 404 }))
  );
  const request = new Request("https://webstudio.is/rest/assets/image.png", {
    method: "POST",
    body: JSON.stringify({ url: "https://example.com/image.png" }),
    headers: { "Content-Type": "application/json" },
  });

  await expect(
    getBrowserUploadBody(request, "application/json")
  ).rejects.toThrow(
    "An error occurred while fetching the image at https://example.com/image.png: not found"
  );
});

test("preserves browser asset format detection", () => {
  expect(
    getBrowserAssetFormat({
      contentType: "application/font-woff",
      name: "font.woff",
    })
  ).toBeUndefined();
  expect(
    getBrowserAssetFormat({
      contentType: "application/octet-stream",
      name: "video.mp4",
    })
  ).toBe("mp4");
  expect(() =>
    getBrowserAssetFormat({
      contentType: "script/javascript",
      name: "script.unknown",
    })
  ).toThrow('MIME type "script/*" is not allowed');
});

test("accepts only stored asset types for API uploads", () => {
  expect(parseAssetType("image")).toBe("image");
  expect(parseAssetType("font")).toBe("font");
  expect(parseAssetType("file")).toBe("file");
  expect(parseAssetType("video")).toBeUndefined();
  expect(parseAssetType(null)).toBeUndefined();
});

test("uses image metadata fallback only when complete", () => {
  expect(
    getAssetInfoFallback({
      format: "png",
      searchParams: new URLSearchParams({
        width: "10",
        height: "20",
      }),
    })
  ).toEqual({ width: 10, height: 20, format: "png" });
  expect(
    getAssetInfoFallback({
      format: undefined,
      searchParams: new URLSearchParams({
        width: "10",
        height: "20",
      }),
    })
  ).toBeUndefined();
  expect(
    getAssetInfoFallback({
      format: "png",
      searchParams: new URLSearchParams({
        width: "10",
      }),
    })
  ).toBeUndefined();
});
