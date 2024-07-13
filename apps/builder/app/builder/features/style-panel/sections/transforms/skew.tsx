import { CssValueListItem, Label } from "@webstudio-is/design-system";
import { useMemo } from "react";
import { FunctionValue, StyleValue, toValue } from "@webstudio-is/css-engine";
import type { TransformFloatingPanelContentProps } from "./utils";
import type { SectionProps } from "../shared/section";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TransformPanelContent } from "./transfor-panel";

const defaultSkewValue = (funcName: string): FunctionValue => ({
  type: "function",
  name: funcName,
  args: { type: "tuple", value: [{ type: "unit", value: 0, unit: "number" }] },
});

const label = "skew";
const index = 3;

const useSkewValue = (value?: StyleValue) => {
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
      name: `Skew: ${toValue(skewX.args)} ${toValue(skewY.args)}`,
    };
  }, [value]);

  return properties;
};

export const Skew = (props: SectionProps) => {
  const { currentStyle, setProperty } = props;
  const value = currentStyle["transform"]?.value;
  const properties = useSkewValue(value);

  if (properties === undefined) {
    return;
  }

  const { name } = properties;

  return (
    <FloatingPanel
      title={label}
      content={
        <TransformPanelContent
          panel={label}
          currentStyle={currentStyle}
          setProperty={setProperty}
        />
      }
    >
      <CssValueListItem
        id={label}
        index={index}
        label={<Label truncate>{name}</Label>}
      ></CssValueListItem>
    </FloatingPanel>
  );
};

export const SkewFloatingPanelContent = (
  props: TransformFloatingPanelContentProps
) => {
  return <div>Skew floating panel content</div>;
};
