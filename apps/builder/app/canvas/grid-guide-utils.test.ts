import { describe, test, expect } from "vitest";
import { __testing__ } from "./grid-guide-utils";

const { findImplicitStart } = __testing__;

describe("findImplicitStart", () => {
  test("returns trackCount when all tracks are explicit", () => {
    // All tracks are regular sizes, no 1.25px
    expect(findImplicitStart("100px 200px 300px", 3)).toBe(3);
  });

  test("detects implicit tracks at the end", () => {
    // Two explicit tracks followed by one implicit (1.25px)
    expect(findImplicitStart("100px 200px 1.25px", 3)).toBe(2);
  });

  test("detects implicit tracks at the start", () => {
    // Negative line numbers can push implicit tracks before explicit ones
    expect(findImplicitStart("1.25px 100px 200px", 3)).toBe(0);
  });

  test("detects multiple implicit tracks", () => {
    expect(findImplicitStart("100px 1.25px 1.25px", 3)).toBe(1);
  });

  test("returns trackCount for empty template", () => {
    expect(findImplicitStart("none", 0)).toBe(0);
  });

  test("returns trackCount for single explicit track", () => {
    expect(findImplicitStart("100px", 1)).toBe(1);
  });

  test("handles fractional explicit sizes near probe value", () => {
    // 1.5px should not trigger implicit detection
    expect(findImplicitStart("1.5px 100px", 2)).toBe(2);
  });

  test("handles exact probe value", () => {
    expect(findImplicitStart("1.25px", 1)).toBe(0);
  });
});
