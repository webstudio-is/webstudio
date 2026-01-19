import type { Styles } from "@webstudio-is/sdk";

/**
 * Extract all unique selectors (states) used in the project styles
 * Returns them sorted by most recently used (based on order in styles map)
 */
export const getUsedSelectors = (styles: Styles): string[] => {
  const selectorsSet = new Set<string>();
  const selectorsOrder: string[] = [];

  // Iterate through all styles and collect unique states
  for (const styleDecl of styles.values()) {
    if (styleDecl.state && styleDecl.state.trim()) {
      const selector = styleDecl.state;
      if (!selectorsSet.has(selector)) {
        selectorsSet.add(selector);
        // Add to front to maintain most recent first
        selectorsOrder.unshift(selector);
      }
    }
  }

  return selectorsOrder;
};
