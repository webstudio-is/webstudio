import { describe, expect, test, vi } from "vitest";
import type { Breakpoint, Breakpoints } from "@webstudio-is/sdk";
import {
  breakpointLimitWarning,
  breakpointPasteLimitWarning,
  buildMergedBreakpointIds,
  findClosestBreakpoint,
  groupBreakpoints,
  hasReachedBreakpointLimit,
  isBaseBreakpoint,
  maxBreakpoints,
} from "./breakpoints";

const breakpoint = (id: string, value: Partial<Breakpoint> = {}): Breakpoint =>
  ({ id, label: id, ...value }) satisfies Breakpoint;

describe("breakpoint limits", () => {
  test("describes and checks the maximum breakpoint count", () => {
    expect(maxBreakpoints).toBe(8);
    expect(breakpointLimitWarning).toContain("up to 8 breakpoints");
    expect(breakpointPasteLimitWarning).toContain(breakpointLimitWarning);
    expect(hasReachedBreakpointLimit(7)).toBe(false);
    expect(hasReachedBreakpointLimit(7, 1)).toBe(true);
  });
});

describe("breakpoint grouping and matching", () => {
  test("detects base breakpoints", () => {
    expect(isBaseBreakpoint({})).toBe(true);
    expect(isBaseBreakpoint({ minWidth: 768 })).toBe(false);
    expect(isBaseBreakpoint({ maxWidth: 767 })).toBe(false);
  });

  test("groups width-based breakpoints separately from custom conditions", () => {
    const custom = { id: "motion", condition: "(prefers-reduced-motion)" };
    const grouped = groupBreakpoints([
      breakpoint("max", { maxWidth: 767 }),
      custom,
      breakpoint("base"),
      breakpoint("desktop", { minWidth: 1280 }),
      breakpoint("tablet", { minWidth: 768 }),
    ]);

    expect(grouped.widthBased.map(({ id }) => id)).toEqual([
      "desktop",
      "tablet",
      "base",
      "max",
    ]);
    expect(grouped.custom).toEqual([custom]);
  });

  test("finds closest width breakpoint and falls back to base", () => {
    const existing = [
      breakpoint("base"),
      breakpoint("tablet", { minWidth: 768 }),
      breakpoint("desktop", { minWidth: 1280 }),
    ];

    expect(
      findClosestBreakpoint(breakpoint("incoming", { minWidth: 900 }), existing)
        ?.id
    ).toBe("tablet");
    expect(
      findClosestBreakpoint(
        breakpoint("custom", { condition: "(hover: hover)" }),
        existing
      )?.id
    ).toBe("base");
  });

  test("maps duplicate breakpoints and merges overflow into closest existing", () => {
    const onMerged = vi.fn();
    const existing: Breakpoints = new Map([
      ["base", breakpoint("base")],
      ["tablet", breakpoint("tablet", { minWidth: 768 })],
    ]);

    const merged = buildMergedBreakpointIds(
      [
        breakpoint("same-tablet", { minWidth: 768 }),
        breakpoint("desktop", { minWidth: 1280 }),
      ],
      existing,
      { maxBreakpointCount: 1, onBreakpointMergedDueToLimit: onMerged }
    );

    expect(merged.get("same-tablet")).toBe("tablet");
    expect(merged.get("desktop")).toBe("tablet");
    expect(onMerged).toHaveBeenCalledTimes(1);
  });
});
