import postcss from "postcss";
import { generateStyleMap, hyphenateProperty } from "@webstudio-is/css-engine";
import {
  type Styles,
  type StyleDecl,
  getStyleDeclKey,
  styles,
} from "@webstudio-is/sdk";

export const parseGeneratedStyleDeclaration = ({
  property,
  value,
}: StyleDecl): {
  declaration?: { property: string; value: string };
  errors: string[];
} => {
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
      return { errors: ["Expected one CSS rule"] };
    }
    const declarations = rule.nodes.filter((node) => node.type === "decl");
    if (
      declarations.length !== 1 ||
      declarations[0].prop !== hyphenateProperty(property) ||
      rule.nodes.some((node) => node.type !== "decl" && node.type !== "comment")
    ) {
      return { errors: ["Expected one CSS declaration"] };
    }
    return {
      declaration: {
        property: declarations[0].prop,
        value: declarations[0].value,
      },
      errors: [],
    };
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : String(error)] };
  }
};

export const writableStyles = styles.refine((value) =>
  Array.from(value.values()).every(
    (style) => parseGeneratedStyleDeclaration(style).errors.length === 0
  )
);

export const parseStyles = (stylesString: string): Styles => {
  const stylesList = JSON.parse(stylesString) as StyleDecl[];
  return new Map(stylesList.map((item) => [getStyleDeclKey(item), item]));
};

export const serializeStyles = (stylesMap: Styles) => {
  const stylesList: StyleDecl[] = Array.from(stylesMap.values());
  return JSON.stringify(stylesList);
};
