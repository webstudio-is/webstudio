import type { FunctionValue, StyleValue } from "@webstudio-is/css-engine";

export const extractSkewPropertiesFromTransform = (skew: StyleValue) => {
  let skewX: FunctionValue | undefined = undefined;
  let skewY: FunctionValue | undefined = undefined;

  if (skew.type !== "tuple") {
    return { skewX, skewY };
  }

  for (const item of skew.value) {
    if (item.type === "function" && item.name === "skewX") {
      skewX = item;
    }

    if (item.type === "function" && item.name === "skewY") {
      skewY = item;
    }
  }

  return { skewX, skewY };
};
