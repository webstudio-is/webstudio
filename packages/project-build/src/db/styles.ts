import postcss from "postcss";
import { hyphenateProperty, toValue } from "@webstudio-is/css-engine";
import {
  type Styles,
  type StyleDecl,
  getStyleDeclKey,
  styles,
} from "@webstudio-is/sdk";

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

export const parseStyles = (stylesString: string): Styles => {
  const stylesList = JSON.parse(stylesString) as StyleDecl[];
  return new Map(stylesList.map((item) => [getStyleDeclKey(item), item]));
};

export const serializeStyles = (stylesMap: Styles) => {
  const stylesList: StyleDecl[] = Array.from(stylesMap.values());
  return JSON.stringify(stylesList);
};
