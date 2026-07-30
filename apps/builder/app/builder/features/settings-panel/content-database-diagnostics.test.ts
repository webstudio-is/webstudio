import { describe, expect, test } from "vitest";
import { isDatabaseSizeNearLimit } from "./content-database-diagnostics";

describe("content database diagnostics", () => {
  test("warns when the database reaches 90% of its limit", () => {
    expect(isDatabaseSizeNearLimit({ usedBytes: 899, maxBytes: 1_000 })).toBe(
      false
    );
    expect(isDatabaseSizeNearLimit({ usedBytes: 900, maxBytes: 1_000 })).toBe(
      true
    );
    expect(isDatabaseSizeNearLimit({ usedBytes: 1_000, maxBytes: 1_000 })).toBe(
      true
    );
  });
});
