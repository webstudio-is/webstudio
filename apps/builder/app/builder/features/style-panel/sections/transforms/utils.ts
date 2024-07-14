import { parseCssValue } from "@webstudio-is/css-data";
import type { SectionProps } from "../shared/section";
import {
  FunctionValue,
  toValue,
  type StyleValue,
  type TupleValue,
  type TupleValueItem,
  type UnitValue,
} from "@webstudio-is/css-engine";
import type { SetProperty } from "../../shared/use-style-data";
import type { StyleInfo } from "../../shared/style-info";
import type { TransformPanel } from "./transforms";
import { useMemo } from "react";

export type TransformFloatingPanelContentProps = {
  currentStyle: StyleInfo;
  setProperty: SetProperty;
};

const defaultRotateValue = (funcName: string): FunctionValue => ({
  type: "function",
  name: funcName,
  args: { type: "tuple", value: [{ type: "unit", value: 0, unit: "deg" }] },
});

const defaultSkewValue = (funcName: string): FunctionValue => ({
  type: "function",
  name: funcName,
  args: { type: "tuple", value: [{ type: "unit", value: 0, unit: "number" }] },
});

export const useTransformPropertyValues = (props: {
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
          if (value?.type !== "tuple") {
            return;
          }

          let rotateX: FunctionValue = defaultRotateValue("rotateX");
          let rotateY: FunctionValue = defaultRotateValue("rotateY");
          let rotateZ: FunctionValue = defaultRotateValue("rotateZ");
          for (const item of value.value) {
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

          return {
            name: `Rotate: ${toValue(rotateX.args)} ${toValue(rotateY.args)} ${toValue(rotateZ.args)}`,
            value: {
              type: "tuple",
              value: [rotateX, rotateY, rotateZ],
            },
          };
        }

        case "skew": {
          const value = currentStyle["transform"]?.value;
          if (value?.type !== "tuple") {
            return;
          }

          let skewX: FunctionValue = defaultSkewValue("skewX");
          let skewY: FunctionValue = defaultSkewValue("skewY");

          for (const item of value.value) {
            if (item.type === "function" && item.name === "skewX") {
              skewX = item;
            }

            if (item.type === "function" && item.name === "skewY") {
              skewY = item;
            }
          }

          return {
            name: `Skew: ${toValue(skewX.args)} ${toValue(skewY.args)}`,
            value: {
              type: "tuple",
              value: [skewX, skewY],
            },
          };
        }
      }
    }, [panel, currentStyle]);

  return properties;
};

export const addDefaultsForTransormSection = (props: {
  createBatchUpdate: SectionProps["createBatchUpdate"];
}) => {
  const { createBatchUpdate } = props;
  const batch = createBatchUpdate();

  const translate = parseCssValue("translate", "0px 0px 0px");
  const scale = parseCssValue("scale", "1 1 1");
  const rotateAndSkew = parseCssValue(
    "transform",
    "rotateX(0deg) rotateY(0deg) rotateZ(0deg) skewX(0) skewY(0)"
  );

  batch.setProperty("translate")(translate);
  batch.setProperty("scale")(scale);
  batch.setProperty("transform")(rotateAndSkew);

  batch.publish();
};

export const isUnitValue = (value: StyleValue): value is UnitValue => {
  return value?.type === "unit" ? true : false;
};

export const updateTupleProperty = (
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
