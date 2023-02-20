import { describe, test, expect } from "@jest/globals";
import {
  type Breakpoints,
  initialBreakpoints,
} from "@webstudio-is/project-build";
import { nanoid } from "nanoid";
import { sort } from "./sort";

describe("Breakpoints sorting for visual rendering", () => {
  test("sort initial breakpoints", () => {
    const breakpoints: Breakpoints = new Map();
    for (const breakpoint of initialBreakpoints) {
      const id = nanoid();
      breakpoints.set(id, { ...breakpoint, id });
    }

    expect(sort(breakpoints)).toStrictEqual(Array.from(breakpoints.values()));
  });

  test("sort custom breakpoints", () => {
    const breakpoints = new Map([
      ["1", { id: "1", label: "0", minWidth: 0 }],
      ["2", { id: "2", label: "3", minWidth: 3 }],
      ["3", { id: "3", label: "2", minWidth: 2 }],
    ]);
    const sortedBreakpoints = [
      { id: "1", label: "0", minWidth: 0 },
      { id: "3", label: "2", minWidth: 2 },
      { id: "2", label: "3", minWidth: 3 },
    ];
    expect(sort(breakpoints)).toStrictEqual(sortedBreakpoints);
  });
});
