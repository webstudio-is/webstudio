import postcss from "postcss";
import {
  generateStyleMap,
  hyphenateProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";

export const parseGeneratedStyleDeclaration = ({
  property,
  value,
}: {
  property: string;
  value: StyleValue;
}): { declaration?: postcss.Declaration; errors: string[] } => {
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
    return { declaration: declarations[0], errors: [] };
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : String(error)] };
  }
};
