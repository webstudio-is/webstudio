import type { MediaRuleOptions } from "./rules";

/**
 * Sort media queries for CSS cascade order.
 * Width-based: minWidth descending, then maxWidth ascending
 * Custom conditions: sorted alphabetically, placed between base and width-based
 *
 * Note: minWidth/maxWidth and condition are mutually exclusive in MediaRuleOptions.
 */
export const compareMedia = (
  optionA: MediaRuleOptions,
  optionB: MediaRuleOptions
) => {
  // If both have custom conditions, sort alphabetically
  if (optionA.condition !== undefined && optionB.condition !== undefined) {
    return optionA.condition.localeCompare(optionB.condition);
  }

  // Custom condition comes after base but before width-based
  if (optionA.condition !== undefined) {
    if (optionB.minWidth === undefined && optionB.maxWidth === undefined) {
      return 1; // optionA (condition) after optionB (base)
    }
    return -1; // optionA (condition) before optionB (width)
  }
  if (optionB.condition !== undefined) {
    if (optionA.minWidth === undefined && optionA.maxWidth === undefined) {
      return -1; // optionA (base) before optionB (condition)
    }
    return 1; // optionA (width) after optionB (condition)
  }

  // Ensures a media with no min/max is always first
  if (optionA.minWidth === undefined && optionA.maxWidth === undefined) {
    return -1;
  }
  if (optionB.minWidth === undefined && optionB.maxWidth === undefined) {
    return 1;
  }

  // Both are defined by minWidth, put the bigger one first
  if (optionA.minWidth !== undefined && optionB.minWidth !== undefined) {
    return optionA.minWidth - optionB.minWidth;
  }
  // Both are defined by maxWidth, put the smaller one first
  if (optionA.maxWidth !== undefined && optionB.maxWidth !== undefined) {
    return optionB.maxWidth - optionA.maxWidth;
  }

  // Media with maxWith should render before minWith just to have the same sorting visually in the UI as in CSSOM.
  return "minWidth" in optionA ? 1 : -1;
};
