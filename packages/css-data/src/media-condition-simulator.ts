import * as csstree from "css-tree";

/**
 * Parse a condition string like "prefers-color-scheme:dark" into feature and value.
 */
export const parseMediaCondition = (
  condition: string
): { feature: string; value: string } | undefined => {
  try {
    const queryText = condition.startsWith("(") ? condition : `(${condition})`;
    const ast = csstree.parse(queryText, { context: "mediaQuery" });

    let feature: string | undefined;
    let value: string | undefined;

    csstree.walk(ast, (node) => {
      if (node.type === "Feature" && node.value) {
        feature = node.name.toLowerCase();
        value = csstree.generate(node.value).toLowerCase();
      }
    });

    if (feature !== undefined && value !== undefined) {
      return { feature, value };
    }
  } catch {
    return;
  }
};
