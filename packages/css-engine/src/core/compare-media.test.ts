import { describe, test, expect } from "vitest";
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

  test("custom conditions sorted alphabetically after base", () => {
    const initial = [
      {},
      { condition: "orientation:portrait" },
      { condition: "hover:hover" },
      { condition: "prefers-color-scheme:dark" },
    ];
    const expected = [
      {},
      { condition: "hover:hover" },
      { condition: "orientation:portrait" },
      { condition: "prefers-color-scheme:dark" },
    ];
    const sorted = initial.sort(compareMedia);
    expect(sorted).toStrictEqual(expected);
  });

  test("custom conditions before width-based", () => {
    const initial = [
      {},
      { minWidth: 1024 },
      { condition: "orientation:portrait" },
      { maxWidth: 768 },
    ];
    const expected = [
      {},
      { condition: "orientation:portrait" },
      { maxWidth: 768 },
      { minWidth: 1024 },
    ];
    const sorted = initial.sort(compareMedia);
    expect(sorted).toStrictEqual(expected);
  });

  test("mixed custom conditions and width-based", () => {
    const initial = [
      {},
      { maxWidth: 991 },
      { condition: "hover:hover" },
      { minWidth: 1280 },
      { condition: "orientation:landscape" },
      { maxWidth: 767 },
      { condition: "prefers-color-scheme:dark" },
    ];
    const expected = [
      {},
      { condition: "hover:hover" },
      { condition: "orientation:landscape" },
      { condition: "prefers-color-scheme:dark" },
      { maxWidth: 991 },
      { maxWidth: 767 },
      { minWidth: 1280 },
    ];
    const sorted = initial.sort(compareMedia);
    expect(sorted).toStrictEqual(expected);
  });

  test("simulated conditions (mediaType only) sorted after base", () => {
    const initial = [
      {},
      { mediaType: "all" as const },
      { mediaType: "not all" as const },
    ];
    const expected = [
      {},
      { mediaType: "all" as const },
      { mediaType: "not all" as const },
    ];
    const sorted = initial.sort(compareMedia);
    expect(sorted).toStrictEqual(expected);
  });

  test("simulated conditions sorted before width-based", () => {
    const initial = [
      {},
      { minWidth: 1024 },
      { mediaType: "all" as const },
      { maxWidth: 768 },
    ];
    const expected = [
      {},
      { mediaType: "all" as const },
      { maxWidth: 768 },
      { minWidth: 1024 },
    ];
    const sorted = initial.sort(compareMedia);
    expect(sorted).toStrictEqual(expected);
  });

  test("simulated conditions mixed with real conditions", () => {
    const initial = [
      {},
      { condition: "prefers-color-scheme:dark" },
      { mediaType: "all" as const },
      { mediaType: "not all" as const },
      { condition: "hover:hover" },
    ];
    // Both real conditions and simulated conditions sort together
    // Real conditions have their condition string, simulated have ""
    const expected = [
      {},
      { mediaType: "all" as const },
      { mediaType: "not all" as const },
      { condition: "hover:hover" },
      { condition: "prefers-color-scheme:dark" },
    ];
    const sorted = initial.sort(compareMedia);
    expect(sorted).toStrictEqual(expected);
  });

  test("full simulation scenario: base, simulated dark, hidden light, width", () => {
    const initial = [
      {},
      { maxWidth: 991 },
      { mediaType: "all" as const }, // simulated dark (always applies)
      { mediaType: "not all" as const }, // simulated light (hidden)
      { minWidth: 1280 },
    ];
    const expected = [
      {},
      { mediaType: "all" as const },
      { mediaType: "not all" as const },
      { maxWidth: 991 },
      { minWidth: 1280 },
    ];
    const sorted = initial.sort(compareMedia);
    expect(sorted).toStrictEqual(expected);
  });
});
