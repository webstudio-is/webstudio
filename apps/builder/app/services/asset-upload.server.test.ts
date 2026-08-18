// @vitest-environment node

import { afterEach, expect, test, vi } from "vitest";
import { RESIZABLE_IMAGE_MIME_TYPES } from "@webstudio-is/sdk";
import { getBrowserUploadBody } from "./asset-upload.server";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("keeps raw browser upload request bodies unchanged", async () => {
  const request = new Request(
    "https://webstudio.is/rest/assets/uploads/image.png",
    {
      method: "POST",
      body: "raw file",
    }
  );

  await expect(
    new Response(
      await getBrowserUploadBody(request, "application/octet-stream")
    ).text()
  ).resolves.toBe("raw file");
});

test("keeps browser JSON file uploads as JSON file content", async () => {
  const request = new Request(
    "https://webstudio.is/rest/assets/uploads/data.json",
    {
      method: "POST",
      body: JSON.stringify({ value: 1 }),
      headers: { "Content-Type": "application/json" },
    }
  );

  await expect(
    new Response(await getBrowserUploadBody(request, "application/json")).text()
  ).resolves.toBe(JSON.stringify({ value: 1 }));
});

test("keeps JSON files with a root URL field as file content", async () => {
  const content = JSON.stringify({ url: "https://example.com/page" });
  const request = new Request(
    "https://webstudio.is/rest/assets/uploads/data.json",
    {
      method: "POST",
      body: content,
      headers: { "Content-Type": "application/json" },
    }
  );

  await expect(
    new Response(await getBrowserUploadBody(request, "application/json")).text()
  ).resolves.toBe(content);
});

test("keeps browser URL image uploads by fetching the remote image body", async () => {
  const fetch = vi.fn(async () => new Response("remote image"));
  vi.stubGlobal("fetch", fetch);
  const request = new Request(
    "https://webstudio.is/rest/assets/uploads/image.png",
    {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/image.png" }),
      headers: {
        "Content-Type": "application/json",
        "x-webstudio-asset-source": "url",
      },
    }
  );

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
  const request = new Request(
    "https://webstudio.is/rest/assets/uploads/image.png",
    {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/image.png" }),
      headers: {
        "Content-Type": "application/json",
        "x-webstudio-asset-source": "url",
      },
    }
  );

  await expect(
    getBrowserUploadBody(request, "application/json")
  ).rejects.toThrow(
    "An error occurred while fetching the image at https://example.com/image.png: not found"
  );
});
