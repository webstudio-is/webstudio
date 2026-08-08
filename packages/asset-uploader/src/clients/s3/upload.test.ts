import { afterEach, describe, expect, test, vi } from "vitest";
import { readdir } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { Readable } from "node:stream";
import type { SignatureV4 } from "@smithy/signature-v4";
import { AssetUploadSizeLimitError } from "../../utils/size-limiter";
import { uploadToS3 } from "./upload";

afterEach(() => vi.unstubAllGlobals());

const leftoverTempFiles = async () =>
  (await readdir(tmpdir())).filter((entry) =>
    entry.startsWith("webstudio-asset-")
  );

describe("uploadToS3", () => {
  test("spools the stream and uploads it with a known Content-Length", async () => {
    const sign = vi.fn(async (request: unknown) => request);
    const fetch = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    const data = {
      async *[Symbol.asyncIterator]() {
        yield new TextEncoder().encode("Post body");
      },
    };

    const result = await uploadToS3({
      signer: { sign } as unknown as SignatureV4,
      name: "folder/post.md",
      type: "text/markdown",
      data,
      maxSize: 1024,
      endpoint: "https://storage.example",
      bucket: "assets",
      assetInfoFallback: undefined,
    });

    expect(result).toEqual({ size: 9, format: "md", meta: {} });
    expect(fetch).toHaveBeenCalledTimes(1);
    // The signer must not receive the body: it is never consumed or destroyed,
    // so passing a stream here would leak a file descriptor per upload.
    expect(sign.mock.calls[0][0]).toMatchObject({
      headers: expect.objectContaining({
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      }),
    });
    expect((sign.mock.calls[0][0] as { body?: unknown }).body).toBeUndefined();
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("PUT");
    expect(init.headers).toBeInstanceOf(Headers);
    expect((init.headers as Headers).get("content-length")).toBe("9");
    expect((init.headers as Headers).get("x-amz-content-sha256")).toBe(
      "UNSIGNED-PAYLOAD"
    );
    expect(init.body).toBeInstanceOf(Readable);
    expect(await leftoverTempFiles()).toEqual([]);
  });

  test("aborts the upload when the stream exceeds the size limit", async () => {
    const fetch = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    const data = {
      async *[Symbol.asyncIterator]() {
        yield new Uint8Array(2048);
      },
    };

    await expect(
      uploadToS3({
        signer: {
          sign: async (request: unknown) => request,
        } as unknown as SignatureV4,
        name: "post.md",
        type: "text/markdown",
        data,
        maxSize: 1024,
        endpoint: "https://storage.example",
        bucket: "assets",
        assetInfoFallback: undefined,
      })
    ).rejects.toBeInstanceOf(AssetUploadSizeLimitError);
    expect(fetch).not.toHaveBeenCalled();
    expect(await leftoverTempFiles()).toEqual([]);
  });

  test("throws when the storage rejects the upload", async () => {
    const fetch = vi.fn(async () => new Response("nope", { status: 403 }));
    vi.stubGlobal("fetch", fetch);

    const data = {
      async *[Symbol.asyncIterator]() {
        yield new TextEncoder().encode("Post body");
      },
    };

    await expect(
      uploadToS3({
        signer: {
          sign: async (request: unknown) => request,
        } as unknown as SignatureV4,
        name: "post.md",
        type: "text/markdown",
        data,
        maxSize: 1024,
        endpoint: "https://storage.example",
        bucket: "assets",
        assetInfoFallback: undefined,
      })
    ).rejects.toThrow("Cannot upload file post.md");
    expect(await leftoverTempFiles()).toEqual([]);
  });
});

const createBodyCollectingServer = async () => {
  const received: { contentLength: string | undefined; chunks: Buffer[] } = {
    contentLength: undefined,
    chunks: [],
  };
  const server: Server = createServer((request, response) => {
    received.contentLength = request.headers["content-length"];
    request.on("data", (chunk: Buffer) => received.chunks.push(chunk));
    request.on("end", () => {
      response.writeHead(200);
      response.end("ok");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Test server did not bind a TCP port");
  }
  return {
    endpoint: `http://127.0.0.1:${address.port}`,
    received,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

describe("uploadToS3 against a real server", () => {
  test("streams the body over the real fetch with duplex: half", async () => {
    const { endpoint, received, close } = await createBodyCollectingServer();
    try {
      const result = await uploadToS3({
        signer: {
          sign: async (request: unknown) => request,
        } as unknown as SignatureV4,
        name: "folder/post.md",
        type: "text/markdown",
        data: {
          async *[Symbol.asyncIterator]() {
            yield new TextEncoder().encode("Post body");
          },
        },
        maxSize: 1024,
        endpoint,
        bucket: "assets",
        assetInfoFallback: undefined,
      });

      expect(result).toEqual({ size: 9, format: "md", meta: {} });
      expect(received.contentLength).toBe("9");
      expect(Buffer.concat(received.chunks)).toEqual(Buffer.from("Post body"));
      expect(await leftoverTempFiles()).toEqual([]);
    } finally {
      await close();
    }
  });
});
