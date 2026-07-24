import { describe, expect, test } from "vitest";
import { validateProjectAssetReadRange } from "./asset-range";

describe("project asset read ranges", () => {
  test("accepts exact bounded ranges", () => {
    expect(() =>
      validateProjectAssetReadRange({ offset: 2, length: 3 }, 5)
    ).not.toThrow();
  });

  test.each([
    { offset: -1, length: 1 },
    { offset: 0, length: 0 },
    { offset: 0.5, length: 1 },
    { offset: Number.MAX_SAFE_INTEGER, length: 1 },
  ])("rejects invalid range $offset:$length", (range) => {
    expect(() => validateProjectAssetReadRange(range)).toThrow(
      "range is invalid"
    );
  });

  test("rejects a range beyond the referenced object", () => {
    expect(() =>
      validateProjectAssetReadRange({ offset: 3, length: 3 }, 5)
    ).toThrow("range is invalid");
  });
});
