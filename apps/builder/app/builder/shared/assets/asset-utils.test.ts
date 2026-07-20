import { expect, test, describe } from "vitest";
import {
  getImageNameAndType,
  getSha256Hash,
  getFileUploadFingerprint,
  uploadingFileDataToAsset,
} from "./asset-utils";

test("distinguishes upload fingerprints for equal files with different names", async () => {
  const first = new File([""], "first.md");
  const second = new File([""], "second.md");

  const firstFingerprint = await getFileUploadFingerprint(first);
  const secondFingerprint = await getFileUploadFingerprint(second);

  expect(firstFingerprint).not.toBe(secondFingerprint);
});

describe("getImageNameAndType", () => {
  test("returns MIME type and filename for valid image", () => {
    const result = getImageNameAndType("photo.jpg");
    expect(result).toEqual(["image/jpeg", "photo.jpg"]);
  });

  test("handles different image extensions", () => {
    expect(getImageNameAndType("image.png")).toEqual([
      "image/png",
      "image.png",
    ]);
    expect(getImageNameAndType("graphic.gif")).toEqual([
      "image/gif",
      "graphic.gif",
    ]);
    expect(getImageNameAndType("vector.svg")).toEqual([
      "image/svg+xml",
      "vector.svg",
    ]);
  });

  test("is case-insensitive", () => {
    const result = getImageNameAndType("PHOTO.JPG");
    expect(result).toEqual(["image/jpeg", "PHOTO.JPG"]);
  });

  test("returns undefined for non-image files", () => {
    expect(getImageNameAndType("document.pdf")).toBeUndefined();
    expect(getImageNameAndType("video.mp4")).toBeUndefined();
    expect(getImageNameAndType("audio.mp3")).toBeUndefined();
  });

  test("returns undefined for files without extension", () => {
    expect(getImageNameAndType("filename")).toBeUndefined();
  });

  test("handles files with multiple dots", () => {
    const result = getImageNameAndType("my.photo.file.png");
    expect(result).toEqual(["image/png", "my.photo.file.png"]);
  });
});

describe("getSha256Hash", () => {
  test("generates consistent hash for same input", async () => {
    const hash1 = await getSha256Hash("test string");
    const hash2 = await getSha256Hash("test string");
    expect(hash1).toBe(hash2);
  });

  test("generates different hashes for different inputs", async () => {
    const hash1 = await getSha256Hash("string1");
    const hash2 = await getSha256Hash("string2");
    expect(hash1).not.toBe(hash2);
  });

  test("generates 64 character hex string", async () => {
    const hash = await getSha256Hash("test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("handles empty string", async () => {
    const hash = await getSha256Hash("");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("generates expected hash for known input", async () => {
    // SHA-256 of "hello" is known
    const hash = await getSha256Hash("hello");
    expect(hash).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });
});

describe("uploadingFileDataToAsset", () => {
  test("preserves the upload destination folder in the preview asset", () => {
    const result = uploadingFileDataToAsset({
      source: "file",
      file: new File(["content"], "document.pdf", {
        type: "application/pdf",
      }),
      assetId: "test-id",
      fingerprintId: "test-fingerprint",
      uploadName: "test-upload-name",
      type: "file",
      objectURL: "blob:test",
      folderId: "folder-id",
    });

    expect(result.folderId).toBe("folder-id");
  });

  test("extracts format from MIME type for font with valid MIME", () => {
    const file = new File(["content"], "InterVariable.woff2", {
      type: "font/woff2",
    });
    const result = uploadingFileDataToAsset({
      source: "file",
      file,
      assetId: "test-id",
      fingerprintId: "test-fingerprint",
      uploadName: "test-upload-name",
      type: "font",
      objectURL: "blob:test",
    });

    expect(result).toMatchObject({
      id: "test-id",
      name: "InterVariable.woff2",
      format: "woff2",
      type: "font",
    });
  });

  test("falls back to filename extension when MIME type is missing", () => {
    const file = new File(["content"], "InterVariable.woff2", {
      type: "", // Empty MIME type
    });
    const result = uploadingFileDataToAsset({
      source: "file",
      file,
      assetId: "test-id",
      fingerprintId: "test-fingerprint",
      uploadName: "test-upload-name",
      type: "font",
      objectURL: "blob:test",
    });

    expect(result).toMatchObject({
      id: "test-id",
      name: "InterVariable.woff2",
      format: "woff2",
      type: "font",
    });
  });

  test("handles image files with valid MIME type", () => {
    const file = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    const result = uploadingFileDataToAsset({
      source: "file",
      file,
      assetId: "test-id",
      fingerprintId: "test-fingerprint",
      uploadName: "test-upload-name",
      type: "image",
      objectURL: "blob:test",
    });

    expect(result).toMatchObject({
      id: "test-id",
      name: "photo.jpg",
      format: "jpeg",
      type: "image",
    });
  });

  test("handles video files", () => {
    const file = new File(["content"], "video.mp4", {
      type: "video/mp4",
    });
    const result = uploadingFileDataToAsset({
      source: "file",
      file,
      assetId: "test-id",
      fingerprintId: "test-fingerprint",
      uploadName: "test-upload-name",
      type: "video",
      objectURL: "blob:test",
    });

    expect(result).toMatchObject({
      id: "test-id",
      name: "video.mp4",
      format: "mp4",
      type: "file",
    });
  });

  test("handles generic file types", () => {
    const file = new File(["content"], "document.pdf", {
      type: "application/pdf",
    });
    const result = uploadingFileDataToAsset({
      source: "file",
      file,
      assetId: "test-id",
      fingerprintId: "test-fingerprint",
      uploadName: "test-upload-name",
      type: "file",
      objectURL: "blob:test",
    });

    expect(result).toMatchObject({
      id: "test-id",
      name: "document.pdf",
      format: "pdf",
      type: "file",
    });
  });

  test("extracts format from filename when MIME type has no subtype", () => {
    const file = new File(["content"], "font.ttf", {
      type: "font",
    });
    const result = uploadingFileDataToAsset({
      source: "file",
      file,
      assetId: "test-id",
      fingerprintId: "test-fingerprint",
      uploadName: "test-upload-name",
      type: "font",
      objectURL: "blob:test",
    });

    expect(result).toMatchObject({
      id: "test-id",
      name: "font.ttf",
      format: "ttf",
      type: "font",
    });
  });

  test("handles files with no extension", () => {
    const file = new File(["content"], "README", {
      type: "",
    });
    const result = uploadingFileDataToAsset({
      source: "file",
      file,
      assetId: "test-id",
      fingerprintId: "test-fingerprint",
      uploadName: "test-upload-name",
      type: "file",
      objectURL: "blob:test",
    });

    expect(result).toMatchObject({
      id: "test-id",
      name: "README",
      format: "",
      type: "file",
    });
  });
});
