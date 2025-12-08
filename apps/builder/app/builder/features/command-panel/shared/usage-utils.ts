/**
 * Formats usage count for display
 */
export const formatUsageCount = (usages: number): string => {
  if (usages === 0) {
    return "unused";
  }
  return `${usages} ${usages === 1 ? "usage" : "usages"}`;
};

/**
 * Returns search terms for usage count
 */
export const getUsageSearchTerms = (usages: number): string[] => {
  return usages === 0 ? ["unused"] : ["usage", "usages"];
};
