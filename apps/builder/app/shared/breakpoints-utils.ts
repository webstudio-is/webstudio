import { compareMedia, equalMedia } from "@webstudio-is/css-engine";
import type { Breakpoint, Breakpoints } from "@webstudio-is/sdk";

/**
 * Check if a breakpoint is the base breakpoint (no min or max width).
 * Note: Does not check for custom conditions.
 */
export const isBaseBreakpoint = (breakpoint: {
  minWidth?: number;
  maxWidth?: number;
}) => breakpoint.minWidth === undefined && breakpoint.maxWidth === undefined;

/**
 * Group breakpoints into width-based and custom condition categories.
 * Width-based breakpoints are ordered: min-width (largest to smallest), base, max-width (largest to smallest).
 * Custom condition breakpoints are kept separate and not sorted.
 *
 * Note: minWidth/maxWidth and condition are mutually exclusive - a breakpoint has either
 * width-based properties OR a custom condition, never both.
 */
export const groupBreakpoints = <
  T extends { minWidth?: number; maxWidth?: number; condition?: string },
>(
  breakpoints: Array<T>
): { widthBased: Array<T>; custom: Array<T> } => {
  const custom = breakpoints.filter(
    (breakpoint) => breakpoint.condition !== undefined
  );
  const widthBased = breakpoints.filter(
    (breakpoint) => breakpoint.condition === undefined
  );

  const sorted = [...widthBased].sort(compareMedia);
  const maxs = sorted.filter((breakpoint) => breakpoint.maxWidth !== undefined);
  const mins = sorted
    .filter((breakpoint) => breakpoint.minWidth !== undefined)
    .reverse();
  const base = sorted.filter(isBaseBreakpoint);

  return {
    widthBased: [...mins, ...base, ...maxs],
    custom,
  };
};

/**
 * Build a map of merged breakpoint IDs from fragment breakpoints to existing breakpoints.
 * Breakpoints are merged when they have matching minWidth, maxWidth, condition, and label.
 * Note: minWidth/maxWidth and condition are mutually exclusive.
 *
 * @param fragmentBreakpoints - Breakpoints from the fragment being inserted
 * @param existingBreakpoints - Existing breakpoints in the project
 * @returns Map of fragment breakpoint IDs to existing breakpoint IDs
 */
export const buildMergedBreakpointIds = (
  fragmentBreakpoints: Breakpoint[],
  existingBreakpoints: Breakpoints
): Map<Breakpoint["id"], Breakpoint["id"]> => {
  const mergedBreakpointIds = new Map<Breakpoint["id"], Breakpoint["id"]>();
  for (const newBreakpoint of fragmentBreakpoints) {
    for (const breakpoint of existingBreakpoints.values()) {
      if (equalMedia(breakpoint, newBreakpoint)) {
        mergedBreakpointIds.set(newBreakpoint.id, breakpoint.id);
        break;
      }
    }
  }
  return mergedBreakpointIds;
};

// Doesn't make sense to allow resizing the canvas lower than this.
export const minCanvasWidth = 240;
