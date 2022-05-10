import { initialBreakpoints, type BaseBreakpoint } from "@webstudio-is/sdk";
import { sort } from "./sort";

describe("Breakpoints sorting for visual rendering", () => {
  test("sort initial breakpoints", () => {
    expect(sort(initialBreakpoints)).toStrictEqual(initialBreakpoints);
  });

  test("sort custom breakpoints", () => {
    const breakpoints = [
      { label: "0", minWidth: 0 },
      { label: "3", minWidth: 3 },
      { label: "2", minWidth: 2 },
    ];
    const sortedBreakpoints = [
      { label: "0", minWidth: 0 },
      { label: "2", minWidth: 2 },
      { label: "3", minWidth: 3 },
    ];
    expect(sort<BaseBreakpoint>(breakpoints)).toStrictEqual(sortedBreakpoints);
  });
});
