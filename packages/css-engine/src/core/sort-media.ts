/**
 * Sort by minWidth descending or maxWidth ascending
 * We want media querries with bigger minWidth to override the smaller once.
 */
type Option = { minWidth?: number; maxWidth?: number };

export const compareMedia = (optionA: Option, optionB: Option) => {
  if (optionA?.minWidth !== undefined && optionB?.minWidth !== undefined) {
    return optionA.minWidth - optionB.minWidth;
  }
  if (optionA?.maxWidth !== undefined && optionB?.maxWidth !== undefined) {
    return optionB.maxWidth - optionA.maxWidth;
  }
  return "minWidth" in optionA ? 1 : -1;
};
