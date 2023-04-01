import { describe, test, expect } from "@jest/globals";
import { compareMedia } from "./compare-media";

describe("Compare media", () => {
  test("mobile first", () => {
    const initial = [
      { minWidth: 0 },
      { minWidth: 768 },
      { minWidth: 1024 },
      { minWidth: 1280 },
    ];
    expect(initial.sort(compareMedia)).toStrictEqual(initial);
  });

  test("random minWidth", () => {
    const initial = [{ minWidth: 0 }, { minWidth: 3 }, { minWidth: 2 }];
    const sorted = [{ minWidth: 0 }, { minWidth: 2 }, { minWidth: 3 }];
    expect(initial.sort(compareMedia)).toStrictEqual(sorted);
  });

  test("webflow", () => {
    const initial = [
      { maxWidth: 991 },
      { maxWidth: 767 },
      { maxWidth: 479 },
      { minWidth: 1280 },
      { minWidth: 1440 },
      { minWidth: 1920 },
    ];
    const sorted = [
      { maxWidth: 991 },
      { maxWidth: 767 },
      { maxWidth: 479 },
      { minWidth: 1280 },
      { minWidth: 1440 },
      { minWidth: 1920 },
    ];
    expect(initial.sort(compareMedia)).toStrictEqual(sorted);
  });
});
