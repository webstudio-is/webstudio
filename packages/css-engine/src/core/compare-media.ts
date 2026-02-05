import type { MediaRuleOptions } from "./rules";

/**
 * Check if a media rule is a simulated condition breakpoint.
 * Simulated conditions have an explicit mediaType ("all" or "not all")
 * but no condition, minWidth, or maxWidth.
 *
 * Note: This assumes that options with ONLY mediaType set are always simulated
 * conditions, not legitimate "screen-only" or "print-only" queries.
 * This is safe because the codebase doesn't use standalone mediaType options
 * for any other purpose.
 */
const isSimulatedCondition = (options: MediaRuleOptions) =>
  options.mediaType !== undefined &&
  options.condition === undefined &&
  options.minWidth === undefined &&
  options.maxWidth === undefined;

/**
 * Check if a media rule is a condition-based breakpoint
 * (either real or simulated).
 */
const isCondition = (options: MediaRuleOptions) =>
  options.condition !== undefined || isSimulatedCondition(options);

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
  const aIsCondition = isCondition(optionA);
  const bIsCondition = isCondition(optionB);

  // If both are conditions (real or simulated), sort alphabetically by condition
  if (aIsCondition && bIsCondition) {
    return (optionA.condition ?? "").localeCompare(optionB.condition ?? "");
  }

  // Condition comes after base but before width-based
  if (aIsCondition) {
    if (optionB.minWidth === undefined && optionB.maxWidth === undefined) {
      return 1; // optionA (condition) after optionB (base)
    }
    return -1; // optionA (condition) before optionB (width)
  }
  if (bIsCondition) {
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
