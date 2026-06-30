import { compareMedia, equalMedia } from "@webstudio-is/css-engine";
import type { Breakpoint, Breakpoints } from "@webstudio-is/sdk";

export const maxBreakpoints = 8;

export const breakpointLimitWarning =
  "You can have up to 8 breakpoints. More breakpoints can make the project harder to maintain.";

export const breakpointPasteLimitWarning = `${breakpointLimitWarning} Pasted breakpoint styles were merged into the closest existing breakpoints.`;

export const hasReachedBreakpointLimit = (
  breakpointCount: number,
  pendingBreakpointCount = 0
) => breakpointCount + pendingBreakpointCount >= maxBreakpoints;

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

const getBreakpointWidthValue = (breakpoint: Breakpoint) => {
  if (breakpoint.minWidth !== undefined && breakpoint.maxWidth !== undefined) {
    return (breakpoint.minWidth + breakpoint.maxWidth) / 2;
  }
  return breakpoint.minWidth ?? breakpoint.maxWidth;
};

export const findClosestBreakpoint = (
  breakpoint: Breakpoint,
  existingBreakpoints: Breakpoint[]
): Breakpoint | undefined => {
  let closestBreakpoint: Breakpoint | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;
  const widthValue = getBreakpointWidthValue(breakpoint);

  if (widthValue !== undefined) {
    for (const existingBreakpoint of existingBreakpoints) {
      const existingWidthValue = getBreakpointWidthValue(existingBreakpoint);
      if (existingWidthValue === undefined) {
        continue;
      }
      const distance = Math.abs(widthValue - existingWidthValue);
      if (distance < closestDistance) {
        closestBreakpoint = existingBreakpoint;
        closestDistance = distance;
      }
    }
  }

  return (
    closestBreakpoint ??
    existingBreakpoints.find(
      (existingBreakpoint) =>
        existingBreakpoint.condition === undefined &&
        isBaseBreakpoint(existingBreakpoint)
    ) ??
    existingBreakpoints[0]
  );
};

/**
 * Build a map of merged breakpoint IDs from fragment breakpoints to existing breakpoints.
 * Breakpoints are merged when they have matching minWidth, maxWidth, condition, and label.
 * Note: minWidth/maxWidth and condition are mutually exclusive.
 *
 * @param fragmentBreakpoints - Breakpoints from the fragment being inserted
 * @param existingBreakpoints - Existing breakpoints in the project
 * @param options.maxBreakpointCount - When provided, overflow fragment breakpoints are merged into the closest existing breakpoint.
 * @returns Map of fragment breakpoint IDs to existing breakpoint IDs
 */
export const buildMergedBreakpointIds = (
  fragmentBreakpoints: Breakpoint[],
  existingBreakpoints: Breakpoints,
  options?: {
    maxBreakpointCount?: number;
    onBreakpointMergedDueToLimit?: () => void;
  }
): Map<Breakpoint["id"], Breakpoint["id"]> => {
  const mergedBreakpointIds = new Map<Breakpoint["id"], Breakpoint["id"]>();
  const acceptedBreakpoints = Array.from(existingBreakpoints.values());

  for (const newBreakpoint of fragmentBreakpoints) {
    for (const breakpoint of acceptedBreakpoints) {
      if (equalMedia(breakpoint, newBreakpoint)) {
        mergedBreakpointIds.set(newBreakpoint.id, breakpoint.id);
        break;
      }
    }
    if (mergedBreakpointIds.has(newBreakpoint.id)) {
      continue;
    }

    if (
      options?.maxBreakpointCount !== undefined &&
      acceptedBreakpoints.length >= options.maxBreakpointCount + 1
    ) {
      const closestBreakpoint = findClosestBreakpoint(
        newBreakpoint,
        acceptedBreakpoints
      );
      if (closestBreakpoint !== undefined) {
        mergedBreakpointIds.set(newBreakpoint.id, closestBreakpoint.id);
        options.onBreakpointMergedDueToLimit?.();
      }
      continue;
    }

    acceptedBreakpoints.push(newBreakpoint);
  }
  return mergedBreakpointIds;
};
