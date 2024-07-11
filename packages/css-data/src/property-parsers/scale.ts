import * as csstree from "css-tree";
import type {
  InvalidValue,
  TupleValue,
  TupleValueItem,
} from "@webstudio-is/css-engine";
import { cssTryParseValue } from "../parse-css-value";

export const parseScale = (input: string): TupleValue | InvalidValue => {
  let tokenStream = input.trim();
  tokenStream = tokenStream.endsWith(";")
    ? tokenStream.slice(0, -1)
    : tokenStream;

  const cleanupKeywords = ["scale:"];

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

  // scale css-proeprty accepts both number and percentage.
  // The syntax from MDN is incorrect and should be updated.
  // Here is a PR that fixes the same, but it is not merged yet.
  // https://github.com/mdn/data/pull/746
  const parsed = csstree.lexer.match("none | <number-percentage>{1,3}", input);
  if (parsed.error) {
    return {
      type: "invalid",
      value: input,
    };
  }

  const scaleValue: TupleValueItem[] = [];

  try {
    csstree.walk(cssAst, (node) => {
      if (node.type === "Value") {
        const children = node.children;
        for (const child of children) {
          if (child.type === "Number") {
            scaleValue.push({
              type: "unit",
              value: Number(child.value),
              unit: "number",
            });
          }

          if (child.type === "Percentage") {
            scaleValue.push({
              type: "unit",
              value: Number(child.value),
              unit: "%",
            });
          }
        }
      }
    });
  } catch {
    return {
      type: "invalid",
      value: input,
    };
  }

  return {
    type: "tuple",
    value: scaleValue,
  };
};
