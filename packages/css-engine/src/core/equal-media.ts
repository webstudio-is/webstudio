import type { MediaRuleOptions } from "./rules";

/**
 * Compare two media query options for equality.
 * Note: minWidth/maxWidth and condition are mutually exclusive.
 */
export const equalMedia = (left: MediaRuleOptions, right: MediaRuleOptions) => {
  return (
    left.minWidth === right.minWidth &&
    left.maxWidth === right.maxWidth &&
    left.condition === right.condition
  );
};
