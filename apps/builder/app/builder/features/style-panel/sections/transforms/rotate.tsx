import { CssValueListItem, Label } from "@webstudio-is/design-system";
import { useMemo } from "react";
import { FunctionValue, toValue } from "@webstudio-is/css-engine";
import type { SectionProps } from "../shared/section";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TransformPanelContent } from "./transfor-panel";
import type {
  TransformFloatingPanelContent,
  TransformFloatingPanelContentProps,
} from "./utils";

const defaultRotateValue = (funcName: string): FunctionValue => ({
  type: "function",
  name: funcName,
  args: { type: "tuple", value: [{ type: "unit", value: 0, unit: "deg" }] },
});

const label = "rotate";
const index = 2;

export const Rotate = (props: SectionProps) => {
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
      name: `Rotate: ${toValue(rotateX.args)} ${toValue(rotateY.args)} ${toValue(rotateZ.args)}`,
    };
  }, [value]);

  if (properties === undefined || value?.type !== "tuple") {
    return;
  }

  const { name } = properties;

  return (
    <FloatingPanel
      title={label}
      content={<TransformPanelContent panel={label} value={value} />}
    >
      <CssValueListItem
        id={label}
        index={index}
        label={<Label truncate>{name}</Label>}
      ></CssValueListItem>
    </FloatingPanel>
  );
};

export const RotatePanelContent = (
  props: TransformFloatingPanelContentProps
) => {
  return <div>Scale panel content</div>;
};
