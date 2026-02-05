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

/**
 * Check if a media query text matches a specific feature:value pair.
 * Does NOT match negated queries.
 */
export const mediaQueryMatchesValue = (
  mediaText: string,
  feature: string,
  value: string
): boolean => {
  try {
    const ast = csstree.parse(mediaText, { context: "mediaQueryList" });

    const negatedQueries = new Set<csstree.MediaQuery>();

    // First pass: identify negated queries
    csstree.walk(ast, (node) => {
      if (node.type === "MediaQuery") {
        if (node.modifier === "not") {
          negatedQueries.add(node);
          return;
        }
        if (node.condition?.children) {
          const hasNotIdentifier = node.condition.children
            .toArray()
            .some(
              (child) => child.type === "Identifier" && child.name === "not"
            );
          if (hasNotIdentifier) {
            negatedQueries.add(node);
          }
        }
      }
    });

    // Second pass: find matching features
    let hasMatch = false;
    let currentQuery: csstree.MediaQuery | undefined;

    csstree.walk(ast, {
      enter(node) {
        if (node.type === "MediaQuery") {
          currentQuery = node;
        }
        if (
          node.type === "Feature" &&
          node.value &&
          currentQuery &&
          !negatedQueries.has(currentQuery)
        ) {
          const nodeFeature = node.name.toLowerCase();
          const nodeValue = csstree.generate(node.value).toLowerCase();

          if (nodeFeature === feature && nodeValue === value) {
            hasMatch = true;
          }
        }
      },
      leave(node) {
        if (node.type === "MediaQuery") {
          currentQuery = undefined;
        }
      },
    });

    return hasMatch;
  } catch {
    return false;
  }
};

/**
 * Recursively collect all CSSMediaRule instances containing the specified feature.
 */
const collectMediaRules = (
  ruleList: CSSRuleList,
  feature: string,
  result: CSSMediaRule[]
): void => {
  const len = ruleList.length;
  for (let i = 0; i < len; i++) {
    const rule = ruleList[i];

    if (rule instanceof CSSMediaRule) {
      if (rule.media.mediaText.toLowerCase().includes(feature)) {
        result.push(rule);
      }
      collectMediaRules(rule.cssRules, feature, result);
    } else if (
      (typeof CSSSupportsRule !== "undefined" &&
        rule instanceof CSSSupportsRule) ||
      (typeof CSSLayerBlockRule !== "undefined" &&
        rule instanceof CSSLayerBlockRule) ||
      (typeof CSSContainerRule !== "undefined" &&
        rule instanceof CSSContainerRule)
    ) {
      collectMediaRules(
        (rule as CSSSupportsRule | CSSLayerBlockRule | CSSContainerRule)
          .cssRules,
        feature,
        result
      );
    }
  }
};

/**
 * Get all media rules containing the specified feature from all stylesheets.
 */
const getMediaRulesForFeature = (
  doc: Document,
  feature: string
): CSSMediaRule[] => {
  const rules: CSSMediaRule[] = [];

  for (let s = 0; s < doc.styleSheets.length; s++) {
    const styleSheet = doc.styleSheets[s];
    try {
      if (styleSheet.cssRules) {
        collectMediaRules(styleSheet.cssRules, feature, rules);
      }
    } catch {
      // CORS - can't access cross-origin stylesheets
    }
  }

  return rules;
};

type SimulatorState = {
  originalMediaTexts: WeakMap<CSSMediaRule, string>;
  modifiedRules: Set<CSSMediaRule>;
};

/**
 * Restore all modified rules to their original state.
 */
const restoreAllRules = (state: SimulatorState): void => {
  for (const rule of Array.from(state.modifiedRules)) {
    const originalText = state.originalMediaTexts.get(rule);
    if (originalText !== undefined) {
      try {
        rule.media.mediaText = originalText;
      } catch {
        // Rule might have been removed from DOM
      }
      state.originalMediaTexts.delete(rule);
    }
    state.modifiedRules.delete(rule);
  }
};

/**
 * Simulate a media condition by manipulating CSS media rules.
 *
 * For the given condition (e.g., "prefers-color-scheme:dark"):
 * - Rules matching the condition get media="all" (always apply)
 * - Rules with same feature but different value get media="not all" (never apply)
 *
 * @param doc - The document to operate on
 * @param condition - The condition to simulate, or undefined to restore
 * @param state - State object for tracking modifications (optional, creates new if not provided)
 * @returns The state object for subsequent calls
 */
export const simulateMediaCondition = (
  doc: Document,
  condition: string | undefined,
  state: SimulatorState = {
    originalMediaTexts: new WeakMap(),
    modifiedRules: new Set(),
  }
): SimulatorState => {
  // Always restore first to ensure clean state
  restoreAllRules(state);

  if (condition === undefined) {
    return state;
  }

  const parsed = parseMediaCondition(condition);
  if (parsed === undefined) {
    return state;
  }

  const { feature, value } = parsed;
  const rules = getMediaRulesForFeature(doc, feature);

  for (const rule of rules) {
    if (!state.originalMediaTexts.has(rule)) {
      state.originalMediaTexts.set(rule, rule.media.mediaText);
    }

    const matches = mediaQueryMatchesValue(
      rule.media.mediaText,
      feature,
      value
    );

    try {
      rule.media.mediaText = matches ? "all" : "not all";
      state.modifiedRules.add(rule);
    } catch {
      // Rule might be in an immutable stylesheet
    }
  }

  return state;
};

export type { SimulatorState };
