import { describe, test, expect } from "@jest/globals";
import { groupBreakpoints } from "./group-breakpoints";

describe("Group breakpoints", () => {
  test("for ui", () => {
    const initial = [
      { minWidth: 1920 },
      { minWidth: 1440 },
      { minWidth: 1280 },
      {},
      { maxWidth: 991 },
      { maxWidth: 767 },
      { maxWidth: 479 },
    ];
    const grouped = [
      { minWidth: 1920 },
      { minWidth: 1440 },
      { minWidth: 1280 },
      {},
      { maxWidth: 991 },
      { maxWidth: 767 },
      { maxWidth: 479 },
    ];
    expect(groupBreakpoints(initial)).toStrictEqual(grouped);
  });
});
