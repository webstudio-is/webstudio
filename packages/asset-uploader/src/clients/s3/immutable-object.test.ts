import { afterEach, describe, expect, test, vi } from "vitest";
import type { SignatureV4 } from "@smithy/signature-v4";
import {
  deleteImmutableObjectFromS3,
  putImmutableObjectToS3,
} from "./immutable-object";

afterEach(() => vi.unstubAllGlobals());

const object = {
  key: "projects/one/resources/posts/indexes/query/revision.json",
  data: new TextEncoder().encode("{}"),
  checksum: `sha256:${"a".repeat(64)}`,
  contentType: "application/json" as const,
};

const createSigner = () => {
  const sign = vi.fn(async (request) => request);
  return { signer: { sign } as unknown as SignatureV4, sign };
};

describe("immutable S3 object persistence", () => {
  test("conditionally writes a private immutable object", async () => {
    const { signer, sign } = createSigner();
    const fetch = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(
      putImmutableObjectToS3({
        signer,
        endpoint: "https://storage.example",
        bucket: "private-indexes",
        object,
      })
    ).resolves.toEqual({ status: "created", checksum: object.checksum });
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "If-None-Match": "*",
          "Cache-Control": "private, max-age=31536000, immutable",
          "x-amz-meta-webstudio-checksum": object.checksum,
        }),
      })
    );
  });

  test("checks the stored checksum after a conditional-write conflict", async () => {
    const { signer, sign } = createSigner();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 412 }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { "x-amz-meta-webstudio-checksum": object.checksum },
        })
      );
    vi.stubGlobal("fetch", fetch);

    await expect(
      putImmutableObjectToS3({
        signer,
        endpoint: "https://storage.example",
        bucket: "private-indexes",
        object,
      })
    ).resolves.toEqual({ status: "exists", checksum: object.checksum });
    expect(sign).toHaveBeenLastCalledWith(
      expect.objectContaining({ method: "HEAD" })
    );
  });

  test("rejects storage errors and unverifiable existing objects", async () => {
    const { signer } = createSigner();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 }))
    );
    await expect(
      putImmutableObjectToS3({
        signer,
        endpoint: "https://storage.example",
        bucket: "private-indexes",
        object,
      })
    ).rejects.toThrow("Cannot persist");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 412 }))
        .mockResolvedValueOnce(new Response(null, { status: 200 }))
    );
    await expect(
      putImmutableObjectToS3({
        signer,
        endpoint: "https://storage.example",
        bucket: "private-indexes",
        object,
      })
    ).rejects.toThrow("has no checksum");
  });
});

describe("immutable S3 object deletion", () => {
  test.each([
    [204, "deleted"],
    [404, "missing"],
  ] as const)("maps status %s to %s", async (status, expected) => {
    const { signer } = createSigner();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status }))
    );
    await expect(
      deleteImmutableObjectFromS3({
        signer,
        endpoint: "https://storage.example",
        bucket: "private-indexes",
        key: object.key,
      })
    ).resolves.toBe(expected);
  });
});
