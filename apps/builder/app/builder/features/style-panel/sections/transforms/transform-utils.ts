import { parseCssValue } from "@webstudio-is/css-data";
import {
  FunctionValue,
  StyleValue,
  toValue,
  type TupleValue,
} from "@webstudio-is/css-engine";
import {
  deleteProperty,
  setProperty,
  type StyleUpdateOptions,
} from "../../shared/use-style-data";
import {
  extractRotatePropertiesFromTransform,
  extractSkewPropertiesFromTransform,
} from "./transform-extractors";
import type { ComputedStyleDecl } from "~/shared/style-object-model";

export const transformPanels = [
  "translate",
  "scale",
  "rotate",
  "skew",
] as const;

export type TransformPanel = (typeof transformPanels)[number];

const defaultTranslate = "0px 0px 0px";
const defaultScale = "100% 100% 100%";
const defaultRotate = "rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
const defaultSkew = "skewX(0deg) skewY(0deg)";

export const getHumanizedTextFromTransformLayer = (
  panel: TransformPanel,
  value: StyleValue
): { label: string; value: StyleValue } | undefined => {
  switch (panel) {
    case "translate":
      return {
        label: `Translate: ${toValue({ ...value, hidden: false })}`,
        value,
      };

    case "scale":
      return {
        label: `Scale: ${toValue({ ...value, hidden: false })}`,
        value,
      };

    case "rotate": {
      const rotate = extractRotatePropertiesFromTransform(value);
      const { rotateX, rotateY, rotateZ } = rotate;
      if (
        rotateX === undefined ||
        rotateY === undefined ||
        rotateZ === undefined
      ) {
        return;
      }

      return {
        label: `Rotate: ${toValue(rotateX.args)} ${toValue(rotateY.args)} ${toValue(rotateZ.args)}`,
        value: {
          type: "tuple",
          value: [rotateX, rotateY, rotateZ],
          hidden: rotateX.hidden || rotateY.hidden || rotateZ.hidden,
        },
      };
    }

    case "skew": {
      const skew = extractSkewPropertiesFromTransform(value);
      const { skewX, skewY } = skew;

      if (skewX === undefined || skewY === undefined) {
        return;
      }

      return {
        label: `Skew: ${toValue(skewX.args)} ${toValue(skewY.args)}`,
        value: {
          type: "tuple",
          value: [skewX, skewY],
          hidden: skewX.hidden || skewY.hidden,
        },
      };
    }
  }
};

export const addDefaultsForTransormSection = (props: {
  panel: (typeof transformPanels)[number];
  styles: ComputedStyleDecl[];
}) => {
  const { panel, styles } = props;

  switch (panel) {
    case "translate": {
      const translate = parseCssValue("translate", defaultTranslate);
      return setProperty("translate")(translate);
    }

    case "scale": {
      const scale = parseCssValue("scale", defaultScale);
      return setProperty("scale")(scale);
    }

    case "skew":
    case "rotate": {
      const parsedValue = parseCssValue(
        "transform",
        panel === "rotate" ? defaultRotate : defaultSkew
      );
      const transform = styles.find(
        (styleDecl) => styleDecl.property === "transform"
      )?.cascadedValue;

      // rotate and skew are maintained using tuple
      // If the existing value is anything other than tuple.
      // We need to update the property to use tuples
      if (transform === undefined || transform.type !== "tuple") {
        return setProperty("transform")(parsedValue);
      }

      if (parsedValue.type === "tuple" && transform.type === "tuple") {
        const filteredValues = removeRotateOrSkewValues(panel, transform);

        return setProperty("transform")({
          ...transform,
          value: [...parsedValue.value, ...filteredValues],
        });
      }
    }
  }
};

export const isTransformPanelPropertyUsed = ({
  panel,
  styles,
}: {
  panel: (typeof transformPanels)[number];
  styles: ComputedStyleDecl[];
}): boolean => {
  switch (panel) {
    case "translate":
    case "scale": {
      const styleDecl = styles.find(
        (styleDecl) => styleDecl.property === panel
      );
      return styleDecl?.cascadedValue.type === "tuple";
    }
    case "rotate": {
      const styleDecl = styles.find(
        (styleDecl) => styleDecl.property === "transform"
      );
      return (
        styleDecl?.cascadedValue.type === "tuple" &&
        extractRotatePropertiesFromTransform(styleDecl.cascadedValue)
          .rotateX !== undefined
      );
    }
    case "skew": {
      const styleDecl = styles.find(
        (styleDecl) => styleDecl.property === "transform"
      );
      return (
        styleDecl?.cascadedValue.type === "tuple" &&
        extractSkewPropertiesFromTransform(styleDecl.cascadedValue).skewX !==
          undefined
      );
    }
    default:
      return false;
  }
};

export const removeRotateOrSkewValues = (
  panel: TransformPanel,
  value: TupleValue
) => {
  const propKeys =
    panel === "rotate" ? ["rotateX", "rotateY", "rotateZ"] : ["skewX", "skewY"];
  return value.value.filter(
    (item) => item.type === "function" && propKeys.includes(item.name) === false
  );
};

export const handleDeleteTransformProperty = ({
  panel,
  value,
}: {
  panel: TransformPanel;
  value: StyleValue;
}) => {
  switch (panel) {
    case "scale":
    case "translate":
      deleteProperty(panel);
      break;

    case "rotate": {
      if (value.type !== "tuple") {
        return;
      }
      const filteredValues = removeRotateOrSkewValues("rotate", value);
      if (filteredValues.length === 0) {
        deleteProperty("transform");
        return;
      }
      setProperty("transform")({
        ...value,
        value: filteredValues,
      });
      break;
    }

    case "skew": {
      if (value.type !== "tuple") {
        return;
      }
      const filteredValues = removeRotateOrSkewValues("skew", value);
      if (filteredValues.length === 0) {
        deleteProperty("transform");
        return;
      }
      setProperty("transform")({
        ...value,
        value: filteredValues,
      });
    }
  }
};

export const handleHideTransformProperty = ({
  panel,
  value,
}: {
  panel: TransformPanel;
  value: StyleValue;
}) => {
  switch (panel) {
    case "scale":
    case "translate": {
      if (value.type !== "tuple") {
        return;
      }
      setProperty(panel)({
        ...value,
        hidden: value.hidden ? false : true,
      });
      break;
    }

    case "rotate": {
      if (value.type !== "tuple") {
        return;
      }
      const newValue: TupleValue = {
        ...value,
        value: [...removeRotateOrSkewValues("rotate", value)],
      };
      const rotate = extractRotatePropertiesFromTransform(value);
      const { rotateX, rotateY, rotateZ } = rotate;

      if (rotateX) {
        newValue.value.unshift({
          ...rotateX,
          hidden: rotateX.hidden ? false : true,
        });
      }

      if (rotateY) {
        newValue.value.unshift({
          ...rotateY,
          hidden: rotateY.hidden ? false : true,
        });
      }

      if (rotateZ) {
        newValue.value.unshift({
          ...rotateZ,
          hidden: rotateZ.hidden ? false : true,
        });
      }

      setProperty("transform")(newValue);
      break;
    }

    case "skew": {
      if (value.type !== "tuple") {
        return;
      }
      const newValue: TupleValue = {
        ...value,
        value: [...removeRotateOrSkewValues("skew", value)],
      };
      const skew = extractSkewPropertiesFromTransform(value);
      const { skewX, skewY } = skew;

      if (skewX) {
        newValue.value.push({
          ...skewX,
          hidden: skewX.hidden ? false : true,
        });
      }

      if (skewY) {
        newValue.value.push({
          ...skewY,
          hidden: skewY.hidden ? false : true,
        });
      }

      setProperty("transform")(newValue);
      break;
    }
  }
};

const transformFunctions = ["rotateX", "rotateY", "rotateZ", "skewX", "skewY"];

export const updateTransformFunction = (
  styleDecl: ComputedStyleDecl,
  name: string,
  newValue: StyleValue,
  options?: StyleUpdateOptions
) => {
  const tuple =
    styleDecl.cascadedValue.type === "tuple"
      ? styleDecl.cascadedValue
      : undefined;
  if (tuple === undefined) {
    return;
  }

  if (newValue.type === "tuple") {
    [newValue] = newValue.value;
  }
  if (newValue.type !== "unit" && newValue.type !== "var") {
    newValue = { type: "unit", value: 0, unit: "deg" };
  }

  const matched = new Map<string, FunctionValue>();
  for (const item of tuple.value) {
    if (item.type === "function") {
      matched.set(item.name, item);
    }
  }
  matched.set(name, {
    type: "function",
    name,
    args: { type: "layers", value: [newValue] },
  });
  const newTuple = structuredClone(tuple);
  // recreate tuple with strictly ordered functions
  newTuple.value = [];
  for (const name of transformFunctions) {
    const functionValue = matched.get(name);
    if (functionValue) {
      newTuple.value.push(functionValue);
    }
  }
  setProperty("transform")(newTuple, options);
};
