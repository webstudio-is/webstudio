import type { MediaRuleOptions } from "./rules";

/**
 * Sort by minWidth descending or maxWidth ascending
 * We want media querries with bigger minWidth to override the smaller once, but the smaller maxWidth to override the bigger once.
 */
export const compareMedia = (
  optionA: MediaRuleOptions,
  optionB: MediaRuleOptions
) => {
  if (optionA?.minWidth !== undefined && optionB?.minWidth !== undefined) {
    return optionA.minWidth - optionB.minWidth;
  }
  if (optionA?.maxWidth !== undefined && optionB?.maxWidth !== undefined) {
    return optionB.maxWidth - optionA.maxWidth;
  }
  return "minWidth" in optionA ? 1 : -1;
};
