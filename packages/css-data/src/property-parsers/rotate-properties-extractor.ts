import type { FunctionValue, StyleValue } from "@webstudio-is/css-engine";

export const extractRotatePropertiesFromTransform = (transform: StyleValue) => {
  let rotateX: FunctionValue | undefined = undefined;
  let rotateY: FunctionValue | undefined = undefined;
  let rotateZ: FunctionValue | undefined = undefined;

  if (transform.type !== "tuple") {
    return { rotateX, rotateY, rotateZ };
  }

  for (const item of transform.value) {
    if (item.type === "function" && item.name === "rotateX") {
      rotateX = item;
    }

    if (item.type === "function" && item.name === "rotateY") {
      rotateY = item;
    }

    if (item.type === "function" && item.name === "rotateZ") {
      rotateZ = item;
    }
  }

  return { rotateX, rotateY, rotateZ };
};
