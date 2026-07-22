import { afterEach, describe, expect, test, vi } from "vitest";
import { createFsClient } from "./fs/fs";
import { createS3Client } from "./s3/s3";

const s3Options = {
  endpoint: "https://storage.example",
  region: "auto",
  accessKeyId: "access",
  secretAccessKey: "secret",
  bucket: "public-assets",
  maxUploadSize: 1,
};

afterEach(() => vi.unstubAllGlobals());

describe("resource index storage", () => {
  test("does not put filesystem indexes in the asset directory by default", () => {
    expect(
      createFsClient({ fileDirectory: "public/assets", maxUploadSize: 1 })
        .resourceIndexStore
    ).toBeUndefined();
    expect(
      createFsClient({
        fileDirectory: "public/assets",
        resourceIndexDirectory: "private/indexes",
        maxUploadSize: 1,
      }).resourceIndexStore
    ).toBeDefined();
  });

  test("uses the configured S3 bucket and hierarchical index key", async () => {
    const fetch = vi.fn(
      async (_input: string | URL | Request) =>
        new Response(null, { status: 200 })
    );
    vi.stubGlobal("fetch", fetch);
    const store = createS3Client(s3Options).resourceIndexStore;

    await store?.putIfAbsent({
      key: "resource-indexes/projects/project-1/index.json",
      data: new TextEncoder().encode("{}"),
      checksum: `sha256:${"a".repeat(64)}`,
      contentType: "application/json",
    });

    expect(fetch.mock.calls[0]?.[0].toString()).toBe(
      "https://storage.example/public-assets/resource-indexes/projects/project-1/index.json"
    );
  });
});
