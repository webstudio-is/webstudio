import { describe, test, expect } from "@jest/globals";
import { compareMedia } from "./compare-media";

describe("Compare media", () => {
  test("min-width", () => {
    const initial = [
      {},
      { minWidth: 1280 },
      { minWidth: 0 },
      { minWidth: 1024 },
      { minWidth: 768 },
    ];
    const expected = [
      {},
      { minWidth: 0 },
      { minWidth: 768 },
      { minWidth: 1024 },
      { minWidth: 1280 },
    ];
    const sorted = initial.sort(compareMedia);
    expect(sorted).toStrictEqual(expected);
  });

  test("max-width", () => {
    const initial = [
      {},
      { maxWidth: 1280 },
      { maxWidth: 0 },
      { maxWidth: 1024 },
      { maxWidth: 768 },
    ];
    const expected = [
      {},
      { maxWidth: 1280 },
      { maxWidth: 1024 },
      { maxWidth: 768 },
      { maxWidth: 0 },
    ];
    const sorted = initial.sort(compareMedia);
    expect(sorted).toStrictEqual(expected);
  });

  test("mixed max and min", () => {
    const initial = [
      {},
      { maxWidth: 991 },
      { maxWidth: 479 },
      { maxWidth: 767 },
      { minWidth: 1440 },
      { minWidth: 1280 },
      { minWidth: 1920 },
    ];
    const expected = [
      {},
      { maxWidth: 991 },
      { maxWidth: 767 },
      { maxWidth: 479 },
      { minWidth: 1280 },
      { minWidth: 1440 },
      { minWidth: 1920 },
    ];
    const sorted = initial.sort(compareMedia);
    expect(sorted).toStrictEqual(expected);
  });
});
