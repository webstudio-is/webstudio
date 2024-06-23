import * as csstree from "css-tree";
import type {
  InvalidValue,
  KeywordValue,
  LayerValueItem,
  LayersValue,
  TupleValue,
  TupleValueItem,
  Unit,
  UnparsedValue,
  UnitValue,
} from "@webstudio-is/css-engine";
import { animatableProperties } from "../";
import { isTimingFunction } from "./transition-property-extractor";
import { cssTryParseValue } from "../parse-css-value";
import { kebabCase } from "change-case";

type AnimatableProperty = (typeof animatableProperties)[number];

export const transitionLongHandProperties = [
  "transitionProperty",
  "transitionTimingFunction",
  "transitionDelay",
  "transitionDuration",
] as const;

export const commonTransitionProperties = [
  "all",
  "opacity",
  "margin",
  "padding",
  "border",
  "transform",
  "filter",
  "flex",
  "background-color",
];

export const isAnimatableProperty = (
  property: string
): property is AnimatableProperty => {
  if (property === "all") {
    return true;
  }

  return [...commonTransitionProperties, ...animatableProperties].some(
    (item) => item === property
  );
};

export const isTransitionLongHandProperty = (
  property: string
): property is (typeof transitionLongHandProperties)[number] => {
  return transitionLongHandProperties.some((item) => item === property);
};

export const isValidTransitionValue = (
  value: LayerValueItem
): value is KeywordValue | UnitValue => {
  return value.type === "keyword" || value.type === "unit";
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

  const cssAst = cssTryParseValue(tokenStream);
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

export const parseTransitionLonghands = (
  property: (typeof transitionLongHandProperties)[number],
  input: string
): LayersValue | InvalidValue | UnparsedValue => {
  const cssAst = cssTryParseValue(input);
  if (cssAst === undefined) {
    return {
      type: "invalid",
      value: input,
    };
  }

  const parsed = csstree.lexer.matchProperty(kebabCase(property), cssAst);
  if (parsed.error) {
    return {
      type: "invalid",
      value: input,
    };
  }

  const layers: LayersValue = { type: "layers", value: [] };
  csstree.walk(cssAst, (node) => {
    if (node.type === "Identifier") {
      if (
        isAnimatableProperty(node.name) === true ||
        isTimingFunction(node.name) === true
      ) {
        layers.value.push({ type: "keyword", value: node.name });
      }
    }

    if (node.type === "Dimension") {
      layers.value.push({
        type: "unit",
        value: Number(node.value),
        unit: node.unit as Unit,
      });
    }
  });

  return layers.value.length > 0 ? layers : { type: "invalid", value: input };
};
