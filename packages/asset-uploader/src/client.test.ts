import { describe, expect, test } from "vitest";
import { validateAssetReadRange } from "./client";

describe("asset read ranges", () => {
  test("accepts a valid range", () => {
    expect(() =>
      validateAssetReadRange({ offset: 2, length: 3 })
    ).not.toThrow();
  });

  test.each([
    { offset: -1, length: 1 },
    { offset: 0, length: 0 },
    { offset: 0.5, length: 1 },
    { offset: Number.MAX_SAFE_INTEGER, length: 1 },
  ])("rejects invalid range $offset:$length", (range) => {
    expect(() => validateAssetReadRange(range)).toThrow(
      "Asset read range is invalid"
    );
  });
});
