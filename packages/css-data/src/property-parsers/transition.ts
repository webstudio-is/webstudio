import * as csstree from "css-tree";
import type {
  InvalidValue,
  LayersValue,
  TupleValue,
  TupleValueItem,
  Unit,
} from "@webstudio-is/css-engine";
import { animatableProperties } from "../";
import { isTimingFunction } from "./transition-property-extractor";

const cssTreeTryParseValue = (input: string) => {
  try {
    const ast = csstree.parse(input, { context: "value" });
    return ast;
  } catch {
    return undefined;
  }
};

type AnimatableProperty = (typeof animatableProperties)[number];
export const isAnimatableProperty = (
  property: string
): property is AnimatableProperty => {
  return animatableProperties.some((item) => item === property);
};

export const parseTransition = (
  transition: string
): LayersValue | InvalidValue => {
  let tokenStream = transition.trim();
  tokenStream = tokenStream.endsWith(";")
    ? tokenStream.slice(0, -1)
    : tokenStream;

  const cleanupKeywords = ["transition:"];

  for (const cleanupKeyword of cleanupKeywords) {
    tokenStream = tokenStream.startsWith(cleanupKeyword)
      ? tokenStream.slice(cleanupKeyword.length).trim()
      : tokenStream;
  }

  const cssAst = cssTreeTryParseValue(tokenStream);

  if (cssAst === undefined) {
    return {
      type: "invalid",
      value: transition,
    };
  }

  const parsed = csstree.lexer.matchProperty("transition", cssAst);
  if (parsed.error) {
    return {
      type: "invalid",
      value: transition,
    };
  }

  try {
    const layers: TupleValue[] = [];
    csstree.walk(cssAst, (node) => {
      if (node.type === "Value") {
        const children = node.children;
        let layer: csstree.CssNode[] = [];

        for (const child of children) {
          layer.push(child);

          if (child.type === "Operator" || children.last === child) {
            const transition: TupleValueItem[] = [];

            for (let index = 0; index < layer.length; index++) {
              const item = layer[index];
              if (item.type === "Identifier") {
                const isAnimatable = isAnimatableProperty(item.name);
                const isTimingFunc = isTimingFunction(item.name);

                if (isTimingFunc === false && isAnimatable === false) {
                  throw new Error(`Invalid transition property: ${item.name}`);
                }

                transition.push({
                  type: "keyword",
                  value: item.name,
                });
              }

              if (item.type === "Dimension") {
                transition.push({
                  type: "unit",
                  value: Number(item.value),
                  unit: item.unit as Unit,
                });
              }

              if (item.type === "Function") {
                transition.push({
                  type: "keyword",
                  value: csstree.generate(item),
                });
              }
            }

            layers.push({
              type: "tuple",
              value: transition,
            });
            layer = [];
            continue;
          }
        }
      }
    });

    return layers.length > 0
      ? {
          type: "layers",
          value: layers,
        }
      : { type: "invalid", value: transition };
  } catch (error) {
    return {
      type: "invalid",
      value: transition,
    };
  }
};
