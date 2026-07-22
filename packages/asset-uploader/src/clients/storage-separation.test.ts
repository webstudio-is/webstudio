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
const indexObject = {
  key: "resource-indexes/projects/project-1/index.json",
  data: new TextEncoder().encode("{}"),
  checksum: `sha256:${"a".repeat(64)}`,
  contentType: "application/json" as const,
};

const expectIndexBucket = async (
  options: Parameters<typeof createS3Client>[0],
  bucket: string
) => {
  const fetch = vi.fn(
    async (_input: string | URL | Request) =>
      new Response(null, { status: 200 })
  );
  vi.stubGlobal("fetch", fetch);
  const store = createS3Client(options).resourceIndexStore;
  expect(store).toBeDefined();

  await store?.putIfAbsent(indexObject);

  expect(fetch.mock.calls[0]?.[0].toString()).toBe(
    `https://storage.example/${bucket}/resource-indexes%2Fprojects%2Fproject-1%2Findex.json`
  );
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

  test("uses the configured S3 bucket for the private index store", async () => {
    await expectIndexBucket(s3Options, s3Options.bucket);
  });

  test("preserves an optional dedicated S3 index bucket", async () => {
    await expectIndexBucket(
      { ...s3Options, resourceIndexBucket: "private-indexes" },
      "private-indexes"
    );
  });
});
