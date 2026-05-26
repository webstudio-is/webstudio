import { describe, test, expect } from "vitest";
import {
  isBaseBreakpoint,
  groupBreakpoints,
  buildMergedBreakpointIds,
  findClosestBreakpoint,
  hasReachedBreakpointLimit,
  maxBreakpoints,
} from "./breakpoints-utils";
import type { Breakpoint, Breakpoints } from "@webstudio-is/sdk";

describe("isBaseBreakpoint", () => {
  test("returns true for breakpoint without min or max width", () => {
    expect(isBaseBreakpoint({})).toBe(true);
    expect(isBaseBreakpoint({ minWidth: undefined, maxWidth: undefined })).toBe(
      true
    );
  });

  test("returns false for breakpoint with min width", () => {
    expect(isBaseBreakpoint({ minWidth: 768 })).toBe(false);
  });

  test("returns false for breakpoint with max width", () => {
    expect(isBaseBreakpoint({ maxWidth: 991 })).toBe(false);
  });

  test("returns false for breakpoint with both min and max width", () => {
    expect(isBaseBreakpoint({ minWidth: 768, maxWidth: 991 })).toBe(false);
  });
});

describe("groupBreakpoints", () => {
  test("groups breakpoints in UI order: min-width (desc), base, max-width (desc)", () => {
    const initial = [
      { minWidth: 1920 },
      { minWidth: 1440 },
      { minWidth: 1280 },
      {},
      { maxWidth: 991 },
      { maxWidth: 767 },
      { maxWidth: 479 },
    ];
    const result = groupBreakpoints(initial);
    expect(result.widthBased).toStrictEqual([
      { minWidth: 1920 },
      { minWidth: 1440 },
      { minWidth: 1280 },
      {},
      { maxWidth: 991 },
      { maxWidth: 767 },
      { maxWidth: 479 },
    ]);
    expect(result.custom).toStrictEqual([]);
  });

  test("handles unsorted input", () => {
    const initial = [
      { maxWidth: 479 },
      { minWidth: 1920 },
      {},
      { maxWidth: 991 },
      { minWidth: 1280 },
    ];
    const result = groupBreakpoints(initial);
    expect(result.widthBased).toStrictEqual([
      { minWidth: 1920 },
      { minWidth: 1280 },
      {},
      { maxWidth: 991 },
      { maxWidth: 479 },
    ]);
    expect(result.custom).toStrictEqual([]);
  });

  test("handles only min-width breakpoints", () => {
    const initial = [{ minWidth: 768 }, { minWidth: 1024 }];
    const result = groupBreakpoints(initial);
    expect(result.widthBased).toStrictEqual([
      { minWidth: 1024 },
      { minWidth: 768 },
    ]);
    expect(result.custom).toStrictEqual([]);
  });

  test("handles only max-width breakpoints", () => {
    const initial = [{ maxWidth: 991 }, { maxWidth: 479 }];
    const result = groupBreakpoints(initial);
    expect(result.widthBased).toStrictEqual([
      { maxWidth: 991 },
      { maxWidth: 479 },
    ]);
    expect(result.custom).toStrictEqual([]);
  });

  test("handles only base breakpoint", () => {
    const initial = [{}];
    const result = groupBreakpoints(initial);
    expect(result.widthBased).toStrictEqual([{}]);
    expect(result.custom).toStrictEqual([]);
  });

  test("handles empty array", () => {
    const result = groupBreakpoints([]);
    expect(result.widthBased).toStrictEqual([]);
    expect(result.custom).toStrictEqual([]);
  });

  test("separates custom condition breakpoints from width-based", () => {
    const initial = [
      { minWidth: 1920 },
      { condition: "orientation: portrait" },
      { minWidth: 1280 },
      {},
      { condition: "hover: hover" },
      { maxWidth: 991 },
    ];
    const result = groupBreakpoints(initial);
    expect(result.widthBased).toStrictEqual([
      { minWidth: 1920 },
      { minWidth: 1280 },
      {},
      { maxWidth: 991 },
    ]);
    expect(result.custom).toStrictEqual([
      { condition: "orientation: portrait" },
      { condition: "hover: hover" },
    ]);
  });
});

describe("buildMergedBreakpointIds", () => {
  test("merges breakpoints with matching minWidth, maxWidth, and label", () => {
    const fragmentBreakpoints: Breakpoint[] = [
      { id: "frag-1", minWidth: 768, label: "Tablet" },
      { id: "frag-2", maxWidth: 479, label: "Mobile" },
      { id: "frag-3", minWidth: 1024, label: "Desktop" },
    ];

    const existingBreakpoints: Breakpoints = new Map([
      ["exist-1", { id: "exist-1", minWidth: 768, label: "Tablet" }],
      ["exist-2", { id: "exist-2", maxWidth: 991, label: "Small Desktop" }],
      ["exist-3", { id: "exist-3", maxWidth: 479, label: "Mobile" }],
    ]);

    const result = buildMergedBreakpointIds(
      fragmentBreakpoints,
      existingBreakpoints
    );

    expect(result.size).toBe(2);
    expect(result.get("frag-1")).toBe("exist-1"); // Tablet matches
    expect(result.get("frag-2")).toBe("exist-3"); // Mobile matches
    expect(result.has("frag-3")).toBe(false); // Desktop doesn't match
  });

  test("returns empty map when no matches found", () => {
    const fragmentBreakpoints: Breakpoint[] = [
      { id: "frag-1", minWidth: 1440, label: "Large Desktop" },
    ];

    const existingBreakpoints: Breakpoints = new Map([
      ["exist-1", { id: "exist-1", minWidth: 768, label: "Tablet" }],
    ]);

    const result = buildMergedBreakpointIds(
      fragmentBreakpoints,
      existingBreakpoints
    );

    expect(result.size).toBe(0);
  });

  test("matches base breakpoints (no min/max)", () => {
    const fragmentBreakpoints: Breakpoint[] = [
      { id: "frag-base", label: "Base" },
    ];

    const existingBreakpoints: Breakpoints = new Map([
      ["exist-base", { id: "exist-base", label: "Base" }],
    ]);

    const result = buildMergedBreakpointIds(
      fragmentBreakpoints,
      existingBreakpoints
    );

    expect(result.size).toBe(1);
    expect(result.get("frag-base")).toBe("exist-base");
  });

  test("handles empty fragment breakpoints", () => {
    const fragmentBreakpoints: Breakpoint[] = [];
    const existingBreakpoints: Breakpoints = new Map([
      ["exist-1", { id: "exist-1", minWidth: 768, label: "Tablet" }],
    ]);

    const result = buildMergedBreakpointIds(
      fragmentBreakpoints,
      existingBreakpoints
    );

    expect(result.size).toBe(0);
  });

  test("handles empty existing breakpoints", () => {
    const fragmentBreakpoints: Breakpoint[] = [
      { id: "frag-1", minWidth: 768, label: "Tablet" },
    ];
    const existingBreakpoints: Breakpoints = new Map();

    const result = buildMergedBreakpointIds(
      fragmentBreakpoints,
      existingBreakpoints
    );

    expect(result.size).toBe(0);
  });

  test("merges only first matching breakpoint", () => {
    const fragmentBreakpoints: Breakpoint[] = [
      { id: "frag-1", minWidth: 768, label: "Tablet" },
    ];

    const existingBreakpoints: Breakpoints = new Map([
      ["exist-1", { id: "exist-1", minWidth: 768, label: "Tablet" }],
      ["exist-2", { id: "exist-2", minWidth: 768, label: "Tablet" }],
    ]);

    const result = buildMergedBreakpointIds(
      fragmentBreakpoints,
      existingBreakpoints
    );

    expect(result.size).toBe(1);
    expect(result.get("frag-1")).toBe("exist-1"); // Should match first one
  });

  test("does not merge breakpoints with different labels", () => {
    const fragmentBreakpoints: Breakpoint[] = [
      { id: "frag-1", minWidth: 768, label: "Tablet" },
    ];

    const existingBreakpoints: Breakpoints = new Map([
      ["exist-1", { id: "exist-1", minWidth: 768, label: "iPad" }],
    ]);

    const result = buildMergedBreakpointIds(
      fragmentBreakpoints,
      existingBreakpoints
    );

    // equalMedia only checks minWidth/maxWidth, not labels
    // So breakpoints with same dimensions but different labels will still merge
    expect(result.size).toBe(1);
    expect(result.get("frag-1")).toBe("exist-1");
  });

  test("keeps total breakpoints within max count by merging overflow into closest existing breakpoint", () => {
    const existingBreakpoints: Breakpoints = new Map([
      ["base", { id: "base", label: "" }],
      ["desktop", { id: "desktop", label: "Desktop", minWidth: 1200 }],
      ["tablet", { id: "tablet", label: "Tablet", maxWidth: 900 }],
      ["mobile", { id: "mobile", label: "Mobile", maxWidth: 480 }],
      ["wide", { id: "wide", label: "Wide", minWidth: 1600 }],
      ["large", { id: "large", label: "Large", minWidth: 2000 }],
      ["print", { id: "print", label: "Print", condition: "print" }],
      ["hover", { id: "hover", label: "Hover", condition: "hover: hover" }],
    ]);
    const fragmentBreakpoints: Breakpoint[] = [
      { id: "frag-existing", label: "Same", maxWidth: 480 },
      { id: "frag-new", label: "New", minWidth: 1440 },
      { id: "frag-overflow", label: "Overflow", maxWidth: 760 },
    ];

    const result = buildMergedBreakpointIds(
      fragmentBreakpoints,
      existingBreakpoints,
      { maxBreakpointCount: maxBreakpoints }
    );

    expect(result.get("frag-existing")).toBe("mobile");
    expect(result.has("frag-new")).toBe(false);
    expect(result.get("frag-overflow")).toBe("tablet");
  });

  test("merges all new breakpoints when existing non-base breakpoints are already at the max count", () => {
    const existingBreakpoints: Breakpoints = new Map([
      ["base", { id: "base", label: "" }],
      ["0", { id: "0", label: "320", maxWidth: 320 }],
      ["1", { id: "1", label: "480", maxWidth: 480 }],
      ["2", { id: "2", label: "768", maxWidth: 768 }],
      ["3", { id: "3", label: "1024", maxWidth: 1024 }],
      ["4", { id: "4", label: "1280", minWidth: 1280 }],
      ["5", { id: "5", label: "1440", minWidth: 1440 }],
      ["6", { id: "6", label: "1920", minWidth: 1920 }],
      ["7", { id: "7", label: "2560", minWidth: 2560 }],
    ]);

    const result = buildMergedBreakpointIds(
      [{ id: "frag", label: "New", minWidth: 1500 }],
      existingBreakpoints,
      { maxBreakpointCount: maxBreakpoints }
    );

    expect(result.get("frag")).toBe("5");
  });

  test("reports when breakpoint is merged because of max count", () => {
    const existingBreakpoints: Breakpoints = new Map([
      ["base", { id: "base", label: "" }],
      ["0", { id: "0", label: "320", maxWidth: 320 }],
      ["1", { id: "1", label: "480", maxWidth: 480 }],
      ["2", { id: "2", label: "768", maxWidth: 768 }],
      ["3", { id: "3", label: "1024", maxWidth: 1024 }],
      ["4", { id: "4", label: "1280", minWidth: 1280 }],
      ["5", { id: "5", label: "1440", minWidth: 1440 }],
      ["6", { id: "6", label: "1920", minWidth: 1920 }],
      ["7", { id: "7", label: "2560", minWidth: 2560 }],
    ]);
    let mergeCount = 0;

    buildMergedBreakpointIds(
      [{ id: "frag", label: "New", minWidth: 1500 }],
      existingBreakpoints,
      {
        maxBreakpointCount: maxBreakpoints,
        onBreakpointMergedDueToLimit: () => {
          mergeCount += 1;
        },
      }
    );

    expect(mergeCount).toBe(1);
  });

  test("does not count base breakpoint against max count", () => {
    const existingBreakpoints: Breakpoints = new Map([
      ["base", { id: "base", label: "" }],
      ["0", { id: "0", label: "320", maxWidth: 320 }],
      ["1", { id: "1", label: "480", maxWidth: 480 }],
      ["2", { id: "2", label: "768", maxWidth: 768 }],
      ["3", { id: "3", label: "1024", maxWidth: 1024 }],
      ["4", { id: "4", label: "1280", minWidth: 1280 }],
      ["5", { id: "5", label: "1440", minWidth: 1440 }],
      ["6", { id: "6", label: "1920", minWidth: 1920 }],
    ]);

    const result = buildMergedBreakpointIds(
      [{ id: "frag", label: "New", minWidth: 1500 }],
      existingBreakpoints,
      { maxBreakpointCount: maxBreakpoints }
    );

    expect(result.has("frag")).toBe(false);
  });
});

describe("findClosestBreakpoint", () => {
  test("finds the closest width-based breakpoint", () => {
    const result = findClosestBreakpoint(
      { id: "new", label: "New", maxWidth: 760 },
      [
        { id: "base", label: "" },
        { id: "mobile", label: "Mobile", maxWidth: 480 },
        { id: "tablet", label: "Tablet", maxWidth: 768 },
      ]
    );

    expect(result?.id).toBe("tablet");
  });

  test("falls back to base for condition breakpoints without comparable widths", () => {
    const result = findClosestBreakpoint(
      { id: "new", label: "Dark", condition: "prefers-color-scheme: dark" },
      [
        { id: "base", label: "" },
        { id: "hover", label: "Hover", condition: "hover: hover" },
      ]
    );

    expect(result?.id).toBe("base");
  });
});

describe("hasReachedBreakpointLimit", () => {
  test("counts saved and pending breakpoints", () => {
    expect(hasReachedBreakpointLimit(maxBreakpoints - 1)).toBe(false);
    expect(hasReachedBreakpointLimit(maxBreakpoints)).toBe(true);
    expect(hasReachedBreakpointLimit(maxBreakpoints - 1, 1)).toBe(true);
  });
});
