import { describe, expect, test } from "vitest";
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

describe("resource index storage separation", () => {
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

  test("requires a distinct S3 bucket before exposing an index store", () => {
    expect(createS3Client(s3Options).resourceIndexStore).toBeUndefined();
    expect(() =>
      createS3Client({
        ...s3Options,
        resourceIndexBucket: s3Options.bucket,
      })
    ).toThrow("distinct from the public asset bucket");
    expect(
      createS3Client({
        ...s3Options,
        resourceIndexBucket: "private-indexes",
      }).resourceIndexStore
    ).toBeDefined();
  });
});
