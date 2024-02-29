import * as csstree from "css-tree";
import type {
  InvalidValue,
  LayerValueItem,
  LayersValue,
  TupleValueItem,
} from "@webstudio-is/css-engine";

const cssTreeTryParseValue = (input: string) => {
  try {
    const ast = csstree.parse(input, { context: "value" });
    return ast;
  } catch {
    return undefined;
  }
};

export const parseFilter = (input: string): LayersValue | InvalidValue => {
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

  const parsed = csstree.lexer.matchProperty("filter", cssAst);
  if (parsed.error) {
    return {
      type: "invalid",
      value: input,
    };
  }

  const layers: LayerValueItem[] = [];

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
    type: "layers",
    value: [...layers],
  };
};
