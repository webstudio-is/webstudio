import { CssValueListItem, Label } from "@webstudio-is/design-system";
import { useMemo } from "react";
import { FunctionValue, toValue } from "@webstudio-is/css-engine";
import type { TransformPropertySectionProps } from "./utils";

const defaultRotateValue = (funcName: string): FunctionValue => ({
  type: "function",
  name: funcName,
  args: { type: "tuple", value: [{ type: "unit", value: 0, unit: "deg" }] },
});

export const Rotate = (props: TransformPropertySectionProps) => {
  const { currentStyle } = props;
  const value = currentStyle["transform"]?.value;
  const properties = useMemo(() => {
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
      rotateX,
      rotateY,
      rotateZ,
      label: `Rotate: ${toValue(rotateX.args)} ${toValue(rotateY.args)} ${toValue(rotateZ.args)}`,
    };
  }, [value]);

  if (properties === undefined) {
    return;
  }

  const { label } = properties;

  return (
    <CssValueListItem
      id={props.panel}
      index={props.index}
      label={<Label truncate>{label}</Label>}
    ></CssValueListItem>
  );
};
