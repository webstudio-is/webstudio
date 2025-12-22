import { expect, test, describe } from "vitest";
import {
  parseAssetName,
  formatAssetName,
  getImageNameAndType,
  getSha256Hash,
} from "./asset-utils";
import type { Asset } from "@webstudio-is/sdk";

describe("parseAssetName", () => {
  test("parses name with hash and extension", () => {
    expect(parseAssetName("hello_hash.ext")).toEqual({
      basename: "hello",
      hash: "hash",
      ext: "ext",
    });
  });

  test("parses name without hash", () => {
    expect(parseAssetName("hello.ext")).toEqual({
      basename: "hello",
      hash: "",
      ext: "ext",
    });
  });

  test("parses name with multiple underscores", () => {
    expect(parseAssetName("hello_hash1.ext_hash2")).toEqual({
      basename: "hello",
      hash: "hash1",
      ext: "ext_hash2",
    });
  });

  test("parses name with hash but no extension", () => {
    expect(parseAssetName("hello_hash1_hash2")).toEqual({
      basename: "hello_hash1",
      hash: "hash2",
      ext: "",
    });
  });
});

describe("formatAssetName", () => {
  test("formats asset with filename", () => {
    const asset: Pick<Asset, "name" | "filename"> = {
      name: "uploaded_abc123.jpg",
      filename: "myimage",
    };
    expect(formatAssetName(asset)).toBe("myimage.jpg");
  });

  test("formats asset without filename", () => {
    const asset: Pick<Asset, "name" | "filename"> = {
      name: "uploaded_abc123.jpg",
      filename: undefined,
    };
    expect(formatAssetName(asset)).toBe("uploaded.jpg");
  });

  test("formats asset with no extension", () => {
    const asset: Pick<Asset, "name" | "filename"> = {
      name: "uploaded_abc123",
      filename: "document",
    };
    expect(formatAssetName(asset)).toBe("document.");
  });
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
