import * as csstree from "css-tree";
import type {
  InvalidValue,
  TupleValue,
  TupleValueItem,
  Unit,
} from "@webstudio-is/css-engine";
import { cssTryParseValue, isValidDeclaration } from "../parse-css-value";
import { colord } from "colord";

/*
  https://github.com/webstudio-is/webstudio/issues/1016
  https://github.com/csstree/csstree/issues/246

  css-tree can't validate filter values.
  So, we are relying on the isValidDeclaration function to validate the filter value.
  Which uses browser CSSStyleValue.parse to validate.
*/

export const parseFilter = (input: string): TupleValue | InvalidValue => {
  let tokenStream = input.trim();
  tokenStream = tokenStream.endsWith(";")
    ? tokenStream.slice(0, -1)
    : tokenStream;

  const cleanupKeywords = ["filter:"];

  for (const cleanupKeyword of cleanupKeywords) {
    tokenStream = tokenStream.startsWith(cleanupKeyword)
      ? tokenStream.slice(cleanupKeyword.length).trim()
      : tokenStream;
  }

  const cssAst = cssTryParseValue(tokenStream);
  if (cssAst === undefined) {
    return {
      type: "invalid",
      value: input,
    };
  }

  const isValidFilterDecleration = isValidDeclaration("filter", input);
  if (isValidFilterDecleration === false) {
    return {
      type: "invalid",
      value: input,
    };
  }

  const layers: TupleValueItem[] = [];
  csstree.walk(cssAst, (node) => {
    if (node.type === "Value") {
      for (const child of node.children) {
        if (child.type === "Function") {
          const tuple: TupleValueItem[] = [];
          for (const arg of child.children) {
            if (arg.type === "Dimension") {
              tuple.push({
                type: "unit",
                value: Number(arg.value),
                unit: arg.unit as Unit,
              });
            }

            if (arg.type === "Percentage") {
              tuple.push({
                type: "unit",
                value: Number(arg.value),
                unit: "%",
              });
            }

            if (arg.type === "Identifier") {
              tuple.push({
                type: "keyword",
                value: arg.name,
              });
            }

            if (arg.type === "Number") {
              tuple.push({
                type: "keyword",
                value: arg.value,
              });
            }

            if (arg.type === "Function" || arg.type === "Hash") {
              const colorValue = colord(csstree.generate(arg));
              if (colorValue.isValid() === true) {
                const rgb = colorValue.toRgb();
                tuple.push({
                  type: "rgb",
                  alpha: rgb.a,
                  r: rgb.r,
                  g: rgb.g,
                  b: rgb.b,
                });
              }
            }
          }

          layers.push({
            type: "function",
            name: child.name,
            args: { type: "tuple", value: tuple },
          });
        }
      }
    }
  });

  return {
    type: "tuple",
    value: [...layers],
  };
};
