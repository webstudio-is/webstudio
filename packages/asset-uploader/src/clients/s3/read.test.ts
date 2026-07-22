import { afterEach, describe, expect, test, vi } from "vitest";
import type { SignatureV4 } from "@smithy/signature-v4";
import { readFromS3 } from "./read";

afterEach(() => vi.unstubAllGlobals());

describe("readFromS3", () => {
  test("signs and performs a bounded GET", async () => {
    const sign = vi.fn(async (request) => request);
    const fetch = vi.fn(
      async () =>
        new Response("body", {
          status: 206,
          headers: { "content-length": "4" },
        })
    );
    vi.stubGlobal("fetch", fetch);

    const result = await readFromS3({
      signer: { sign } as unknown as SignatureV4,
      name: "folder/post.md",
      range: { offset: 10, length: 4 },
      endpoint: "https://storage.example",
      bucket: "assets",
    });

    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        path: "/assets/folder%2Fpost.md",
        headers: expect.objectContaining({ Range: "bytes=10-13" }),
      })
    );
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://storage.example/assets/folder%2Fpost.md"),
      expect.objectContaining({ method: "GET" })
    );
    expect(result.contentLength).toBe(4);
  });

  test("preserves hierarchical index key separators", async () => {
    const sign = vi.fn(async (request) => request);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}"))
    );

    await readFromS3({
      signer: { sign } as unknown as SignatureV4,
      name: "resource-indexes/projects/project%2Fone/index.json",
      endpoint: "https://storage.example",
      bucket: "assets",
      keyType: "hierarchical",
    });

    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/assets/resource-indexes/projects/project%252Fone/index.json",
      })
    );
  });

  test("rejects ignored ranges and invalid inputs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("whole file"))
    );
    const signer = {
      sign: async <Request>(request: Request) => request,
    } as unknown as SignatureV4;
    await expect(
      readFromS3({
        signer,
        name: "post.md",
        range: { offset: 1, length: 1 },
        endpoint: "https://storage.example",
        bucket: "assets",
      })
    ).rejects.toThrow("did not honor");
    await expect(
      readFromS3({
        signer,
        name: "post.md",
        range: { offset: -1, length: 1 },
        endpoint: "https://storage.example",
        bucket: "assets",
      })
    ).rejects.toThrow("range is invalid");
  });
});
