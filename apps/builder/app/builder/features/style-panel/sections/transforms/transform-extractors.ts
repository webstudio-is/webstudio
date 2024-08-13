import type {
  FunctionValue,
  KeywordValue,
  StyleValue,
  UnitValue,
} from "@webstudio-is/css-engine";

export const extractRotatePropertiesFromTransform = (transform: StyleValue) => {
  let rotateX: FunctionValue | undefined;
  let rotateY: FunctionValue | undefined;
  let rotateZ: FunctionValue | undefined;

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

const isValidTransformOriginValue = (
  value: StyleValue
): value is UnitValue | KeywordValue => {
  return value.type === "unit" || value.type === "keyword";
};

export const extractTransformOriginValues = (value: StyleValue) => {
  if (value.type !== "tuple") {
    return;
  }

  let x: KeywordValue | UnitValue = { type: "keyword", value: "center" };
  let y: KeywordValue | UnitValue = { type: "keyword", value: "center" };
  let z: UnitValue = { type: "unit", unit: "px", value: 0 };

  // https://www.w3.org/TR/css-transforms-1/#transform-origin-property
  // https://github.com/mdn/content/issues/35411
  // If only one value is specified, the second value is assumed to be center.
  if (value.value.length === 1 && value.value[0].type === "unit") {
    x = value.value[0];
  }

  if (value.value.length === 1 && value.value[0].type === "keyword") {
    if (["top", "bottom"].includes(value.value[0].value)) {
      y = value.value[0];
    }

    if (["left", "right"].includes(value.value[0].value)) {
      x = value.value[0];
    }
  }

  if (
    value.value.length === 2 &&
    isValidTransformOriginValue(value.value[0]) &&
    isValidTransformOriginValue(value.value[1])
  ) {
    x = value.value[0];
    y = value.value[1];
  }

  if (
    value.value.length === 3 &&
    isValidTransformOriginValue(value.value[0]) &&
    isValidTransformOriginValue(value.value[1]) &&
    value.value[2].type === "unit"
  ) {
    x = value.value[0];
    y = value.value[1];
    z = value.value[2];
  }

  return {
    x,
    y,
    z,
  };
};
