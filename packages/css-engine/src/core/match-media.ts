import type { MediaRuleOptions } from "./rules";

// This will match a breakpoint that has no min/max.
export const matchMedia = (options: MediaRuleOptions, width: number) => {
  const minWidth = options.minWidth ?? Number.MIN_SAFE_INTEGER;
  const maxWidth = options.maxWidth ?? Number.MAX_SAFE_INTEGER;
  return width >= minWidth && width <= maxWidth;
};
