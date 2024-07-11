import * as csstree from "css-tree";
import type {
  InvalidValue,
  LayersValue,
  TupleValue,
  TupleValueItem,
  Unit,
} from "@webstudio-is/css-engine";
import { cssTryParseValue } from "../parse-css-value";

export const parseTransform = (input: string): TupleValue | InvalidValue => {
  let tokenStream = input.trim();
  tokenStream = tokenStream.endsWith(";")
    ? tokenStream.slice(0, -1)
    : tokenStream;

  const cleanupKeywords = ["transform:"];

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

  const parsed = csstree.lexer.matchProperty("transform", cssAst);
  if (parsed.error) {
    return {
      type: "invalid",
      value: input,
    };
  }

  const transformValue: TupleValueItem[] = [];

  csstree.walk(cssAst, (node) => {
    if (node.type === "Value") {
      for (const child of node.children) {
        if (child.type === "Function") {
          const isCommaSeparatedArgs = child.children.some(
            (arg) => arg.type === "Operator" && arg.value === ","
          );

          const args: TupleValue | LayersValue = isCommaSeparatedArgs
            ? { type: "layers", value: [] }
            : { type: "tuple", value: [] };

          for (const arg of child.children) {
            if (arg.type === "Number") {
              args.value.push({
                type: "unit",
                value: Number(arg.value),
                unit: "number",
              });
            }

            if (arg.type === "Dimension") {
              args.value.push({
                type: "unit",
                value: Number(arg.value),
                unit: arg.unit as Unit,
              });
            }

            if (arg.type === "Percentage") {
              args.value.push({
                type: "unit",
                value: Number(arg.value),
                unit: "%",
              });
            }
          }

          transformValue.push({
            type: "function",
            name: child.name,
            args,
          });
        }
      }
    }
  });

  return {
    type: "tuple",
    value: transformValue,
  };
};
