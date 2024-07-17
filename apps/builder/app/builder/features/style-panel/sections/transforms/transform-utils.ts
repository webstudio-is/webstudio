import {
  extractRotatePropertiesFromTransform,
  extractSkewPropertiesFromTransform,
  parseCssValue,
} from "@webstudio-is/css-data";
import {
  FunctionValue,
  toValue,
  type StyleValue,
  type TupleValue,
  type TupleValueItem,
  type UnitValue,
} from "@webstudio-is/css-engine";
import type { DeleteProperty, SetProperty } from "../../shared/use-style-data";
import type { StyleInfo } from "../../shared/style-info";
import type { TransformPanel } from "./transforms";
import { useMemo } from "react";

export type TransformFloatingPanelContentProps = {
  currentStyle: StyleInfo;
  propertyValue: TupleValue;
  setProperty: SetProperty;
};

const defaultTranslate = "0px 0px 0px";
const defaultScale = "1 1 1";
const defaultRotate = "rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
const defaultSkew = "skewX(0deg) skewY(0deg)";

export const isUnitValue = (value: StyleValue): value is UnitValue => {
  return value?.type === "unit" ? true : false;
};

export const useHumaneTransformPropertyValues = (props: {
  currentStyle: StyleInfo;
  panel: TransformPanel;
}): { name: string; value: TupleValue } | undefined => {
  const { currentStyle, panel } = props;

  const properties: { name: string; value: TupleValue } | undefined =
    useMemo(() => {
      switch (panel) {
        case "translate": {
          const value = currentStyle["translate"]?.value;
          if (value?.type !== "tuple") {
            return;
          }

          return {
            name: `Translate: ${toValue(value)}`,
            value: value,
          };
        }

        case "scale": {
          const value = currentStyle["scale"]?.value;
          if (value?.type !== "tuple") {
            return;
          }

          return {
            name: `Scale: ${toValue(value)}`,
            value: value,
          };
        }

        case "rotate": {
          const value = currentStyle["transform"]?.value;
          if (value === undefined) {
            return;
          }

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
            name: `Rotate: ${toValue(rotateX.args)} ${toValue(rotateY.args)} ${toValue(rotateZ.args)}`,
            value: {
              type: "tuple",
              value: [rotateX, rotateY, rotateZ],
              hidden: rotateX.hidden || rotateY.hidden || rotateZ.hidden,
            },
          };
        }

        case "skew": {
          const value = currentStyle["transform"]?.value;
          if (value === undefined) {
            return;
          }
          const skew = extractSkewPropertiesFromTransform(value);
          const { skewX, skewY } = skew;

          if (skewX === undefined || skewY === undefined) {
            return;
          }

          return {
            name: `Skew: ${toValue(skewX.args)} ${toValue(skewY.args)}`,
            value: {
              type: "tuple",
              value: [skewX, skewY],
              hidden: skewX.hidden || skewY.hidden,
            },
          };
        }
      }
    }, [panel, currentStyle]);

  return properties;
};

export const addDefaultsForTransormSection = (props: {
  panel: TransformPanel;
  currentStyle: StyleInfo;
  setProperty: SetProperty;
}) => {
  const { setProperty, panel, currentStyle } = props;

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
      const value = currentStyle["transform"]?.value;
      const parsedValue = parseCssValue(
        "transform",
        panel === "rotate" ? defaultRotate : defaultSkew
      );

      // rotate and skew are maintained using tuple
      // If the existing value is anything other than tuple.
      // We need to update the property to use tuples
      if (value?.type !== "tuple") {
        return setProperty("transform")(parsedValue);
      }

      if (parsedValue.type === "tuple" && value.type === "tuple") {
        const filteredValues = removeRotateOrSkewValues(panel, value);

        return setProperty("transform")({
          ...value,
          value: [...parsedValue.value, ...filteredValues],
        });
      }
    }
  }
};

export const isTransformPanelPropertyExists = (params: {
  currentStyle: StyleInfo;
  panel: TransformPanel;
}): boolean => {
  const { currentStyle, panel } = params;
  switch (panel) {
    case "scale":
    case "translate":
      return currentStyle[panel]?.value.type === "tuple";

    case "rotate": {
      const rotate = currentStyle["transform"]?.value;
      return (
        rotate?.type === "tuple" &&
        extractRotatePropertiesFromTransform(rotate).rotateX !== undefined
      );
    }

    case "skew": {
      const skew = currentStyle["transform"]?.value;
      return (
        skew?.type === "tuple" &&
        extractSkewPropertiesFromTransform(skew).skewX !== undefined
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

export const handleDeleteTransformProperty = (params: {
  currentStyle: StyleInfo;
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  panel: TransformPanel;
}) => {
  const { deleteProperty, panel, currentStyle, setProperty } = params;
  switch (panel) {
    case "scale":
    case "translate":
      deleteProperty(panel);
      break;

    case "rotate": {
      const value = currentStyle["transform"]?.value;
      if (value?.type !== "tuple") {
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
      const value = currentStyle["transform"]?.value;
      if (value?.type !== "tuple") {
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

export const handleHideTransformProperty = (params: {
  setProperty: SetProperty;
  currentStyle: StyleInfo;
  panel: TransformPanel;
}) => {
  const { panel, setProperty, currentStyle } = params;
  switch (panel) {
    case "scale":
    case "translate": {
      const value = currentStyle[panel]?.value;
      if (value?.type !== "tuple") {
        return;
      }
      setProperty(panel)({
        ...value,
        hidden: value.hidden ? false : true,
      });
      break;
    }

    case "rotate": {
      const value = currentStyle["transform"]?.value;
      if (value?.type !== "tuple") {
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
      const value = currentStyle["transform"]?.value;
      if (value?.type !== "tuple") {
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

export const updateTransformTuplePropertyValue = (
  index: number,
  newValue: TupleValueItem,
  value: TupleValue
): TupleValue => {
  const newArray: TupleValueItem[] = [...value.value];
  newArray.splice(index, 1, newValue);
  return {
    ...value,
    value: newArray,
  };
};

export const updateRotateOrSkewPropertyValue = (props: {
  index: number;
  panel: "rotate" | "skew";
  currentStyle: StyleInfo;
  value: FunctionValue;
  propertyValue: TupleValue;
}): TupleValue => {
  const { index, value, propertyValue, panel } = props;
  const newPropertyValue = updateTransformTuplePropertyValue(
    index,
    value,
    propertyValue
  );

  const existingTransforms = props.currentStyle["transform"]?.value;
  if (existingTransforms?.type === "tuple") {
    const filteredValues = removeRotateOrSkewValues(panel, existingTransforms);
    return {
      ...existingTransforms,
      value: [...newPropertyValue.value, ...filteredValues],
    };
  }

  return newPropertyValue;
};