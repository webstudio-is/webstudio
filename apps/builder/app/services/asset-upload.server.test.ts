import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  getAssetContentHash,
  RESIZABLE_IMAGE_MIME_TYPES,
} from "@webstudio-is/sdk";
import {
  getBrowserUploadBody,
  getUrlAssetContentHash,
} from "./asset-upload.server";

const server = setupServer();
beforeAll(() =>
  server.listen({
    onUnhandledRequest(request, print) {
      const { origin } = new URL(request.url);
      if (
        origin === "https://example.com" ||
        origin === "https://source.example.com"
      ) {
        print.error();
      }
    },
  })
);
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

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
  const received = vi.fn((request: Request) => {
    expect(request.headers.get("accept")).toBe(
      RESIZABLE_IMAGE_MIME_TYPES.join(",")
    );
    return new HttpResponse("remote image");
  });
  server.use(
    http.get("https://example.com/image.png", ({ request }) =>
      received(request)
    )
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
    new Response(await getBrowserUploadBody(request, "application/json")).text()
  ).resolves.toBe("remote image");
  expect(received).toHaveBeenCalledOnce();
  // The image backend must not replace other fetch requests in this process.
  await expect(
    fetch("data:text/plain,unrelated").then((response) => response.text())
  ).resolves.toBe("unrelated");
});

test("reports browser URL image fetch failures", async () => {
  server.use(
    http.get(
      "https://example.com/image.png",
      () => new HttpResponse("not found", { status: 404 })
    )
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

test("hashes remote SVG bytes for upload deduplication", async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  const received = vi.fn(() => new HttpResponse(svg));
  server.use(
    http.get("https://source.example.com/cgi/image/logo.svg", ({ request }) => {
      expect(new URL(request.url).searchParams.get("format")).toBe("raw");
      return received();
    })
  );

  await expect(
    getUrlAssetContentHash(
      "https://source.example.com/cgi/image/logo.svg?format=raw",
      "logo.svg"
    )
  ).resolves.toBe(await getAssetContentHash(new TextEncoder().encode(svg)));
  expect(received).toHaveBeenCalledOnce();
});
