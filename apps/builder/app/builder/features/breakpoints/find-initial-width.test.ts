import { describe, test, expect } from "@jest/globals";
import { findInitialWidth } from "./find-initial-width";

const fallbackWidth = 1000;

const breakpoints = [
  { id: "0", label: "Base" },
  { id: "1", label: "Tablet", maxWidth: 991 },
  { id: "2", label: "Mobile landscape", maxWidth: 767 },
  { id: "3", label: "Mobile portrait", maxWidth: 479 },
  { id: "4", label: "Large", minWidth: 1280 },
  { id: "5", label: "Extra Large", minWidth: 1440 },
];

describe("Find initial width", () => {
  test("base", () => {
    expect(
      findInitialWidth(breakpoints, breakpoints[0], fallbackWidth)
    ).toStrictEqual(fallbackWidth);
  });
  test("tablet", () => {
    expect(
      findInitialWidth(breakpoints, breakpoints[1], fallbackWidth)
    ).toStrictEqual(768);
  });
  test("mobile landscape", () => {
    expect(
      findInitialWidth(breakpoints, breakpoints[2], fallbackWidth)
    ).toStrictEqual(480);
  });
  test("mobile portrait", () => {
    expect(
      findInitialWidth(breakpoints, breakpoints[3], fallbackWidth)
    ).toStrictEqual(320);
  });
  test("large", () => {
    expect(
      findInitialWidth(breakpoints, breakpoints[4], fallbackWidth)
    ).toStrictEqual(1280);
  });
  test("extra large", () => {
    expect(
      findInitialWidth(breakpoints, breakpoints[5], fallbackWidth)
    ).toStrictEqual(1440);
  });
});
