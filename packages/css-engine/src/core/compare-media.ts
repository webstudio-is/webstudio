import type { MediaRuleOptions } from "./rules";

/**
 * Sort by minWidth descending or maxWidth ascending
 * We want media querries with bigger minWidth to override the smaller once, but the smaller maxWidth to override the bigger once.
 */
export const compareMedia = (
  optionA: MediaRuleOptions,
  optionB: MediaRuleOptions
) => {
  // Both are defined by minWidth, put the bigger one first
  if (optionA?.minWidth !== undefined && optionB?.minWidth !== undefined) {
    return optionA.minWidth - optionB.minWidth;
  }
  // Both are defined by maxWidth, put the smaller one first
  if (optionA?.maxWidth !== undefined && optionB?.maxWidth !== undefined) {
    return optionB.maxWidth - optionA.maxWidth;
  }

  // Media with maxWith should render before minWith just to have the same sorting visually in the UI as in CSSOM.
  return "minWidth" in optionA ? 1 : -1;
};
