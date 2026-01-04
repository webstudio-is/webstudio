import type { MediaRuleOptions } from "./rules";

/**
 * Check if a media query matches a given width.
 * Only applies to width-based breakpoints (minWidth/maxWidth).
 * Custom condition breakpoints are not matched by this function.
 */
export const matchMedia = (options: MediaRuleOptions, width: number) => {
  const minWidth = options.minWidth ?? Number.MIN_SAFE_INTEGER;
  const maxWidth = options.maxWidth ?? Number.MAX_SAFE_INTEGER;
  return width >= minWidth && width <= maxWidth;
};
