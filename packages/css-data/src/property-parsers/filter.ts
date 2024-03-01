import * as csstree from "css-tree";
import type {
  InvalidValue,
  TupleValue,
  TupleValueItem,
} from "@webstudio-is/css-engine";
import { cssTreeTryParseValue, isValidDeclaration } from "../parse-css-value";

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

  const cssAst = cssTreeTryParseValue(tokenStream);
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
          layers.push({ type: "keyword", value: csstree.generate(child) });
        }
      }
    }
  });

  return {
    type: "tuple",
    value: [...layers],
  };
};
