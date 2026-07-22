import type { SignatureV4 } from "@smithy/signature-v4";
import { afterEach, describe, expect, test, vi } from "vitest";
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
  test("conditionally writes a private object under a hierarchical key", async () => {
    const { signer, sign } = createSigner();
    const fetch = vi.fn(
      async (_input: string | URL | Request) =>
        new Response(null, { status: 200 })
    );
    vi.stubGlobal("fetch", fetch);

    await expect(
      putImmutableObjectToS3({
        signer,
        endpoint: "https://storage.example",
        bucket: "private-indexes",
        object,
      })
    ).resolves.toEqual({ status: "created", checksum: object.checksum });
    expect(fetch.mock.calls[0]?.[0].toString()).toBe(
      `https://storage.example/private-indexes/${object.key}`
    );
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PUT",
        path: `/private-indexes/${object.key}`,
        headers: expect.objectContaining({
          "If-None-Match": "*",
          "Cache-Control": "private, max-age=31536000, immutable",
          "x-amz-meta-webstudio-checksum": object.checksum,
        }),
      })
    );
  });

  test("transport-encodes values without escaping structural separators", async () => {
    const { signer, sign } = createSigner();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 }))
    );

    await putImmutableObjectToS3({
      signer,
      endpoint: "https://storage.example",
      bucket: "private-indexes",
      object: { ...object, key: "projects/project%2Fone/index.json" },
    });

    expect(sign.mock.calls[0]?.[0].path).toBe(
      "/private-indexes/projects/project%252Fone/index.json"
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

  test("retries conditional-write races with a finite bound", async () => {
    const { signer } = createSigner();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(
      putImmutableObjectToS3({
        signer,
        endpoint: "https://storage.example",
        bucket: "private-indexes",
        object,
      })
    ).resolves.toMatchObject({ status: "created" });
    expect(fetch).toHaveBeenCalledTimes(3);

    const failedFetch = vi.fn(async () => new Response(null, { status: 409 }));
    vi.stubGlobal("fetch", failedFetch);
    await expect(
      putImmutableObjectToS3({
        signer,
        endpoint: "https://storage.example",
        bucket: "private-indexes",
        object,
      })
    ).rejects.toThrow("Cannot persist");
    expect(failedFetch).toHaveBeenCalledTimes(3);
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

  test("deletes an immutable object idempotently", async () => {
    const { signer, sign } = createSigner();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetch);
    const input = {
      signer,
      endpoint: "https://storage.example",
      bucket: "private-indexes",
      key: object.key,
    };

    await expect(deleteImmutableObjectFromS3(input)).resolves.toBe("deleted");
    await expect(deleteImmutableObjectFromS3(input)).resolves.toBe("missing");
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
