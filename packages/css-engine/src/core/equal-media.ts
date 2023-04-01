import type { MediaRuleOptions } from "./rules";

export const equalMedia = (left: MediaRuleOptions, right: MediaRuleOptions) => {
  return left.minWidth === right.minWidth && left.maxWidth === right.maxWidth;
};
