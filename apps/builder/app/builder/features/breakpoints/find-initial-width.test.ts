import { describe, test, expect } from "@jest/globals";
import { findInitialWidth } from "./find-initial-width";

const workspaceWidth = 1000;

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
      findInitialWidth(breakpoints, breakpoints[0], workspaceWidth)
    ).toStrictEqual(workspaceWidth);
  });
  test("tablet", () => {
    expect(
      findInitialWidth(breakpoints, breakpoints[1], workspaceWidth)
    ).toStrictEqual(768);
  });
  test("mobile landscape", () => {
    expect(
      findInitialWidth(breakpoints, breakpoints[2], workspaceWidth)
    ).toStrictEqual(480);
  });
  test("mobile portrait", () => {
    expect(
      findInitialWidth(breakpoints, breakpoints[3], workspaceWidth)
    ).toStrictEqual(320);
  });
  test("large", () => {
    expect(
      findInitialWidth(breakpoints, breakpoints[4], workspaceWidth)
    ).toStrictEqual(1280);
  });
  test("extra large", () => {
    expect(
      findInitialWidth(breakpoints, breakpoints[5], workspaceWidth)
    ).toStrictEqual(1440);
  });

  test("0 min-width", () => {
    const breakpoints = [{ id: "0", label: "x", minWidth: 0 }];
    expect(
      findInitialWidth(breakpoints, breakpoints[0], workspaceWidth)
    ).toStrictEqual(320);
  });

  test("low min-width", () => {
    const breakpoints = [{ id: "0", label: "x", minWidth: 123 }];
    expect(
      findInitialWidth(breakpoints, breakpoints[0], workspaceWidth)
    ).toStrictEqual(123);
  });

  test("no previous max-width", () => {
    const breakpoints = [{ id: "0", label: "x", maxWidth: 100 }];
    expect(
      findInitialWidth(breakpoints, breakpoints[0], workspaceWidth)
    ).toStrictEqual(320);
  });
});
