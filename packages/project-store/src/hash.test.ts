import { describe, expect, test } from "vitest";
import { isContentHash, sha256, sha256Hex } from "./hash";

describe("content hashes", () => {
  test("uses the same digest for strings, buffers, and views", async () => {
    const bytes = new TextEncoder().encode("hello");
    const expected =
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

    await expect(sha256Hex("hello")).resolves.toBe(expected);
    await expect(sha256Hex(bytes)).resolves.toBe(expected);
    await expect(sha256Hex(bytes.buffer)).resolves.toBe(expected);
    await expect(sha256("hello")).resolves.toBe(`sha256:${expected}`);
  });

  test("recognizes only complete lowercase SHA-256 content hashes", () => {
    expect(isContentHash(`sha256:${"a".repeat(64)}`)).toBe(true);
    expect(isContentHash(`sha256:${"A".repeat(64)}`)).toBe(false);
    expect(isContentHash(`sha256:${"a".repeat(63)}`)).toBe(false);
  });
});
