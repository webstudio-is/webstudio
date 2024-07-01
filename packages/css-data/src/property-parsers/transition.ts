import * as csstree from "css-tree";
import type {
  InvalidValue,
  KeywordValue,
  LayerValueItem,
  LayersValue,
  Unit,
  UnitValue,
  FunctionValue,
  StyleProperty,
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
  "transitionBehavior",
] as const satisfies StyleProperty[];

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
): value is KeywordValue | UnitValue | FunctionValue => {
  return (
    value.type === "keyword" ||
    value.type === "unit" ||
    value.type === "function" ||
    value.type === "unparsed"
  );
};

export const parseTransitionLonghandProperty = (
  property: (typeof transitionLongHandProperties)[number],
  input: string
): LayersValue | InvalidValue => {
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
  try {
    csstree.walk(cssAst, (node) => {
      if (node.type === "Value") {
        const children = node.children;

        for (const child of children) {
          switch (property) {
            case "transitionTimingFunction": {
              if (child.type === "Identifier") {
                layers.value.push({ type: "keyword", value: child.name });
              }

              if (child.type === "Function") {
                if (isTimingFunction(child.name) === false) {
                  throw new Error(
                    `Invalid timing function, received ${csstree.generate(child)}`
                  );
                }

                // transition-timing function arguments are comma seperated values
                const args: LayersValue = { type: "layers", value: [] };
                const timingFunction: FunctionValue = {
                  type: "function",
                  args,
                  name: child.name,
                };

                for (const arg of child.children) {
                  if (arg.type === "Number") {
                    args.value.push({ type: "keyword", value: arg.value });
                  }

                  if (arg.type === "Identifier") {
                    args.value.push({ type: "keyword", value: arg.name });
                  }

                  if (arg.type === "Dimension") {
                    args.value.push({
                      type: "unit",
                      value: Number(arg.value),
                      unit: arg.unit as Unit,
                    });
                  }
                }

                layers.value.push(timingFunction);
              }

              break;
            }

            case "transitionDuration":
            case "transitionDelay": {
              if (child.type === "Dimension") {
                layers.value.push({
                  type: "unit",
                  value: Number(child.value),
                  unit: child.unit as Unit,
                });
              }

              break;
            }

            default: {
              throw new Error(`Received invalid property to parse ${property}`);
            }
          }
        }
      }
    });
  } catch (error) {
    return {
      type: "invalid",
      value: input,
    };
  }

  return layers.value.length > 0 ? layers : { type: "invalid", value: input };
};
