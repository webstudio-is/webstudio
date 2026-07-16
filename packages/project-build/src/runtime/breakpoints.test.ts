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
  isBaseWidthBreakpoint,
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
    expect(isBaseWidthBreakpoint({})).toBe(true);
    expect(
      isBaseWidthBreakpoint({ condition: "(prefers-reduced-motion)" })
    ).toBe(false);
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

  test("groups max-width-only and empty breakpoint lists", () => {
    expect(
      groupBreakpoints([
        breakpoint("mobile", { maxWidth: 479 }),
        breakpoint("tablet", { maxWidth: 991 }),
      ]).widthBased.map(({ id }) => id)
    ).toEqual(["tablet", "mobile"]);

    expect(groupBreakpoints([])).toEqual({ widthBased: [], custom: [] });
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

  test("merges matching media even when labels differ", () => {
    const existing: Breakpoints = new Map([
      ["tablet", breakpoint("tablet", { minWidth: 768, label: "Tablet" })],
    ]);

    const merged = buildMergedBreakpointIds(
      [breakpoint("ipad", { minWidth: 768, label: "iPad" })],
      existing
    );

    expect(merged.get("ipad")).toBe("tablet");
  });

  test("does not count the base breakpoint against the max breakpoint count", () => {
    const existing: Breakpoints = new Map([
      ["base", breakpoint("base")],
      ["0", breakpoint("0", { maxWidth: 320 })],
      ["1", breakpoint("1", { maxWidth: 480 })],
      ["2", breakpoint("2", { maxWidth: 768 })],
      ["3", breakpoint("3", { maxWidth: 1024 })],
      ["4", breakpoint("4", { minWidth: 1280 })],
      ["5", breakpoint("5", { minWidth: 1440 })],
      ["6", breakpoint("6", { minWidth: 1920 })],
    ]);

    const merged = buildMergedBreakpointIds(
      [breakpoint("incoming", { minWidth: 1500 })],
      existing,
      { maxBreakpointCount: maxBreakpoints }
    );

    expect(merged.has("incoming")).toBe(false);
  });
});
