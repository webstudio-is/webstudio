import { describe, expect, test } from "vitest";
import {
  encodeStoragePathSegment,
  getHostedProjectStoragePrefixes,
  validateStorageKey,
} from "./storage-key";

describe("storage path segments", () => {
  test.each([
    ["project", "project"],
    ["..", "%2E%2E"],
    [".", "%2E"],
    ["a/b", "a%2Fb"],
    ["100%", "100%25"],
    ["投稿", "%E6%8A%95%E7%A8%BF"],
  ])("encodes %j as one safe segment", (value, expected) => {
    expect(encodeStoragePathSegment(value)).toBe(expected);
  });

  test("rejects an empty segment", () => {
    expect(() => encodeStoragePathSegment("")).toThrow(
      "Storage path segment cannot be empty"
    );
  });

  test("derives one encoded hosted project layout", () => {
    expect(getHostedProjectStoragePrefixes("project/..")).toEqual({
      database: "projects/project%2F%2E%2E/db",
      assets: "projects/project%2F%2E%2E/assets",
    });
  });

  test.each(["../outside", "a//b", "a\\b", "a\0b"])(
    "rejects non-portable storage key %j",
    (key) => {
      expect(() => validateStorageKey(key)).toThrow("Invalid object key");
    }
  );
});
