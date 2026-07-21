import { describe, expect, test } from "vitest";
import { isContentHash } from "./content-hash";

describe("isContentHash", () => {
  test("accepts lowercase SHA-256 hashes", () => {
    expect(isContentHash("a".repeat(64))).toBe(true);
  });

  test.each([
    "a".repeat(63),
    "a".repeat(65),
    "A".repeat(64),
    "g".repeat(64),
    "sha256:" + "a".repeat(64),
    "",
    undefined,
    null,
  ])("rejects invalid content hash: %s", (value) => {
    expect(isContentHash(value)).toBe(false);
  });
});
