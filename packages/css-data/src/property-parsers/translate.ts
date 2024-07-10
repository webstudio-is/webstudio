import * as csstree from "css-tree";
import type {
  InvalidValue,
  TupleValue,
  TupleValueItem,
  Unit,
} from "@webstudio-is/css-engine";
import { cssTryParseValue } from "../parse-css-value";

export const parseTranslate = (input: string): TupleValue | InvalidValue => {
  let tokenStream = input.trim();
  tokenStream = tokenStream.endsWith(";")
    ? tokenStream.slice(0, -1)
    : tokenStream;

  const cleanupKeywords = ["translate:"];

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

  const parsed = csstree.lexer.matchProperty("translate", cssAst);
  if (parsed.error) {
    return {
      type: "invalid",
      value: input,
    };
  }

  const translateValues: TupleValueItem[] = [];

  csstree.walk(cssAst, (node) => {
    if (node.type === "Value") {
      const children = node.children;
      for (const child of children) {
        if (child.type === "Dimension") {
          translateValues.push({
            type: "unit",
            value: Number(child.value),
            unit: child.unit as Unit,
          });
        }

        if (child.type === "Percentage") {
          translateValues.push({
            type: "unit",
            value: Number(child.value),
            unit: "%",
          });
        }
      }
    }
  });

  return {
    type: "tuple",
    value: translateValues,
  };
};
