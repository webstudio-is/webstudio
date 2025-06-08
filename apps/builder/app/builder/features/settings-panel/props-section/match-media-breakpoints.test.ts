import { describe, it, expect } from "vitest";
import { matchMediaBreakpoints } from "./match-media-breakpoints";
import type { IsEqual } from "type-fest";

describe("matchMediaBreakpoints", () => {
  it("returns undefined when values array is undefined", () => {
    const matchingBreakpointIds = ["mobile", "tablet", "desktop"];
    const matcher = matchMediaBreakpoints(matchingBreakpointIds);

    expect(matcher(undefined)).toBeUndefined();
  });

  it("returns undefined when no matching breakpoints are found", () => {
    const matchingBreakpointIds = ["mobile", "tablet", "desktop"];
    const values: Array<[string, number]> = [
      ["other-breakpoint", 100],
      ["another-breakpoint", 200],
    ];

    const matcher = matchMediaBreakpoints(matchingBreakpointIds);

    expect(matcher(values)).toBeUndefined();
  });

  it("returns the value of the last matching breakpoint", () => {
    const matchingBreakpointIds = ["mobile", "tablet"];
    const values: Array<[string, number]> = [
      ["mobile", 320],
      ["tablet", 768],
      ["desktop", 1024],
    ];

    const matcher = matchMediaBreakpoints(matchingBreakpointIds);

    expect(matcher(values)).toBe(768);
  });

  it("preserves the value type", () => {
    const matchingBreakpointIds = ["mobile", "tablet", "desktop"];

    const stringValues: Array<[string, string]> = [["mobile", "small"]];
    const stringMatcher = matchMediaBreakpoints(matchingBreakpointIds);
    const strResult = stringMatcher(stringValues);
    expect(strResult).toBe("small");
    true satisfies IsEqual<string | undefined, typeof strResult>;

    const booleanValues: Array<[string, boolean]> = [["tablet", true]];
    const booleanMatcher = matchMediaBreakpoints(matchingBreakpointIds);
    const boolResult = booleanMatcher(booleanValues);
    expect(boolResult).toBe(true);
    true satisfies IsEqual<boolean | undefined, typeof boolResult>;

    const objectValues: Array<[string, { width: number }]> = [
      ["desktop", { width: 1024 }],
    ];
    const objectMatcher = matchMediaBreakpoints(matchingBreakpointIds);
    const objResult = objectMatcher(objectValues);
    expect(objResult).toEqual({ width: 1024 });
    true satisfies IsEqual<{ width: number } | undefined, typeof objResult>;
  });
});
