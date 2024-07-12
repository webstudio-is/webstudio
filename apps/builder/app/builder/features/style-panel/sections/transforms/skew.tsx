import { CssValueListItem, Label } from "@webstudio-is/design-system";
import { useMemo } from "react";
import { FunctionValue, toValue } from "@webstudio-is/css-engine";
import type { TransformPropertySectionProps } from "./utils";

const defaultSkewValue = (funcName: string): FunctionValue => ({
  type: "function",
  name: funcName,
  args: { type: "tuple", value: [{ type: "unit", value: 0, unit: "number" }] },
});

export const Skew = (props: TransformPropertySectionProps) => {
  const { currentStyle } = props;
  const value = currentStyle["transform"]?.value;
  const properties = useMemo(() => {
    if (value?.type !== "tuple") {
      return;
    }

    let skewX: FunctionValue = defaultSkewValue("skewX");
    let skewY: FunctionValue = defaultSkewValue("skewY");

    for (const item of value.value) {
      if (item.type === "function" && item.name === "rotateX") {
        skewX = item;
      }

      if (item.type === "function" && item.name === "rotateY") {
        skewY = item;
      }
    }

    return {
      skewX,
      skewY,
      label: `Skew: ${toValue(skewX.args)} ${toValue(skewY.args)}`,
    };
  }, [value]);

  if (properties === undefined) {
    return;
  }

  const { label } = properties;

  return (
    <CssValueListItem
      id={props.title}
      index={props.index}
      label={<Label truncate>{label}</Label>}
    ></CssValueListItem>
  );
};
