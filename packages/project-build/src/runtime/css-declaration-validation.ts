import postcss from "postcss";
import { hyphenateProperty, toValue } from "@webstudio-is/css-engine";
import { styles, type StyleDecl } from "@webstudio-is/sdk";

export const isValidGeneratedStyleDeclaration = ({
  property,
  value,
}: StyleDecl): boolean => {
  const expectedProperty = hyphenateProperty(property);
  try {
    const root = postcss.parse(`a{${expectedProperty}: ${toValue(value)}}`);
    const rule = root.first;
    return (
      root.nodes.length === 1 &&
      rule?.type === "rule" &&
      rule.selector === "a" &&
      rule.nodes.length === 1 &&
      rule.first?.type === "decl" &&
      rule.first.prop === expectedProperty
    );
  } catch {
    return false;
  }
};

export const writableStyles = styles.refine((value) =>
  Array.from(value.values()).every(isValidGeneratedStyleDeclaration)
);
