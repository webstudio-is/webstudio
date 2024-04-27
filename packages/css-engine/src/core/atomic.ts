import hash from "@emotion/hash";
import type { StyleSheet } from "./style-sheet";
import { NestingRule } from "./rules";
import { toValue, type TransformValue } from "./to-value";

type Options = {
  getKey: (rule: NestingRule) => string;
  transformValue?: TransformValue;
};

export const generateAtomic = (sheet: StyleSheet, options: Options) => {
  const { getKey, transformValue } = options;
  const atomicRules = new Map<string, NestingRule>();
  const classesMap = new Map<string, string[]>();
  for (const rule of sheet.nestingRules.values()) {
    const groupKey = getKey(rule);
    const classList: string[] = [];
    // convert each declaration into separate rule
    for (const declaration of rule.getDeclarations()) {
      const atomicHash = hash(
        declaration.breakpoint +
          declaration.selector +
          declaration.property +
          toValue(declaration.value, transformValue)
      );
      // "c" makes sure hash always starts with a letter.
      const className = `c${atomicHash}`;
      // reuse atomic rules
      let atomicRule = atomicRules.get(atomicHash);
      if (atomicRule === undefined) {
        atomicRule = new NestingRule(`.${className}`, new Map());
        atomicRule.setDeclaration(declaration);
        atomicRules.set(atomicHash, atomicRule);
      }
      classList.push(className);
    }
    classesMap.set(groupKey, classList);
  }
  const cssText = sheet.generateWith({
    nestingRules: Array.from(atomicRules.values()),
    transformValue,
  });
  return { cssText, classesMap };
};
