import { $selectedBreakpoint } from "~/shared/nano-states";

/**
 * Simulates condition-based breakpoints by manipulating CSS media rules at runtime.
 *
 * For the selected condition (e.g., prefers-color-scheme:light):
 * - Make matching rules always match by replacing with ALWAYS_TRUE_CONDITION
 * - Make non-matching rules never match by adding ALWAYS_FALSE_CONDITION
 */

const ALWAYS_TRUE_CONDITION = "(min-width: 0px)";
const ALWAYS_FALSE_CONDITION = "(max-width: 0px)";
const DEBOUNCE_DELAY_MS = 50;

const originalMediaTexts = new WeakMap<CSSMediaRule, string>();
const mediaRuleCache = new Map<string, Set<CSSMediaRule>>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const parseCondition = (
  condition: string
): { feature: string; value: string } | null => {
  const match = condition.match(/^([^:]+):(.+)$/);
  if (!match) {
    return null;
  }
  return { feature: match[1].trim(), value: match[2].trim() };
};

const getMediaRulesForFeature = (feature: string): Set<CSSMediaRule> => {
  if (mediaRuleCache.has(feature)) {
    return mediaRuleCache.get(feature)!;
  }

  const rules = new Set<CSSMediaRule>();

  for (let s = 0; s < document.styleSheets.length; s++) {
    const styleSheet = document.styleSheets[s];

    try {
      if (!styleSheet.cssRules) {
        continue;
      }

      for (let i = 0; i < styleSheet.cssRules.length; i++) {
        const rule = styleSheet.cssRules[i];

        if (
          rule instanceof CSSMediaRule &&
          rule.media.mediaText.includes(feature)
        ) {
          rules.add(rule);
        }
      }
    } catch (e) {
      // CORS
    }
  }

  mediaRuleCache.set(feature, rules);
  return rules;
};

const clearCache = (): void => {
  mediaRuleCache.clear();
};

const ruleMatchesValue = (
  rule: CSSMediaRule,
  feature: string,
  value: string
): boolean => {
  const mediaText = rule.media.mediaText;
  return (
    mediaText.includes(`${feature}: ${value}`) ||
    mediaText.includes(`${feature}:${value}`)
  );
};

const applySimulationImmediate = (condition: string | undefined): void => {
  restoreAllRules();

  if (!condition) {
    return;
  }

  const parsed = parseCondition(condition);
  if (!parsed) {
    console.warn(
      `[Breakpoint Simulator] Invalid condition format: ${condition}`
    );
    return;
  }

  const { feature, value } = parsed;
  const rules = getMediaRulesForFeature(feature);

  for (const rule of rules) {
    if (!originalMediaTexts.has(rule)) {
      originalMediaTexts.set(rule, rule.media.mediaText);
    }

    if (ruleMatchesValue(rule, feature, value)) {
      try {
        rule.media.deleteMedium(`(${feature}: ${value})`);
      } catch (e) {
        try {
          rule.media.deleteMedium(`(${feature}:${value})`);
        } catch (e2) {
          console.warn(
            `[Breakpoint Simulator] Failed to delete media condition for ${feature}:${value}`,
            e2
          );
        }
      }
      rule.media.appendMedium(ALWAYS_TRUE_CONDITION);
    } else {
      rule.media.appendMedium(ALWAYS_FALSE_CONDITION);
    }
  }
};

const applySimulation = (condition: string | undefined): void => {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    applySimulationImmediate(condition);
    debounceTimer = null;
  }, DEBOUNCE_DELAY_MS);
};

const restoreAllRules = (): void => {
  for (let s = 0; s < document.styleSheets.length; s++) {
    const styleSheet = document.styleSheets[s];

    try {
      if (!styleSheet.cssRules) {
        continue;
      }

      for (let i = 0; i < styleSheet.cssRules.length; i++) {
        const rule = styleSheet.cssRules[i];

        if (rule instanceof CSSMediaRule && originalMediaTexts.has(rule)) {
          const originalText = originalMediaTexts.get(rule);

          if (!originalText) {
            console.warn(
              "[Breakpoint Simulator] Missing original text for rule"
            );
            continue;
          }

          while (rule.media.length > 0) {
            const item = rule.media.item(0);
            if (item) {
              rule.media.deleteMedium(item);
            } else {
              break;
            }
          }

          const parts = originalText.split(" and ");
          for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed && trimmed !== "all") {
              try {
                rule.media.appendMedium(trimmed);
              } catch (e) {
                console.warn(
                  `[Breakpoint Simulator] Failed to restore media condition: ${trimmed}`,
                  e
                );
              }
            }
          }

          if (rule.media.mediaText !== originalText) {
            console.warn(
              `[Breakpoint Simulator] Restoration mismatch: expected "${originalText}", got "${rule.media.mediaText}"`
            );
          }

          originalMediaTexts.delete(rule);
        }
      }
    } catch (e) {
      console.warn("[Breakpoint Simulator] Error during restoration", e);
    }
  }
};

export const subscribeBreakpointSimulator = (options: {
  signal: AbortSignal;
}): (() => void) => {
  const selectedBreakpoint = $selectedBreakpoint.get();
  applySimulation(selectedBreakpoint?.condition);

  const unsubscribe = $selectedBreakpoint.listen((breakpoint) => {
    applySimulation(breakpoint?.condition);
  });

  options.signal.addEventListener("abort", () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    unsubscribe();
    applySimulationImmediate(undefined);
    clearCache();
  });

  return unsubscribe;
};
