import postcss from "postcss";
import { generateStyleMap, hyphenateProperty } from "@webstudio-is/css-engine";
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
    const root = postcss.parse(
      `a{${generateStyleMap(new Map([[property, value]]))}}`
    );
    const rule = root.first;
    if (
      root.nodes.length !== 1 ||
      rule?.type !== "rule" ||
      rule.selector !== "a"
    ) {
      return false;
    }
    const declarations = rule.nodes.filter((node) => node.type === "decl");
    return (
      declarations.length === 1 &&
      declarations[0].prop === expectedProperty &&
      rule.nodes.every(
        (node) => node.type === "decl" || node.type === "comment"
      )
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
