import { CssValueListItem, Flex, Label } from "@webstudio-is/design-system";
import {
  StyleValue,
  toValue,
  TupleValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { useMemo } from "react";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TransformPanelContent } from "./transfor-panel";
import { CssValueInputContainer } from "../../shared/css-value-input";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import type { SectionProps } from "../shared/section";
import type {
  TransformFloatingPanelContentProps,
  TransformPanel,
} from "./utils";

const label: TransformPanel = "scale";
const index = 1;
const property: StyleProperty = "scale";

export const Scale = (props: SectionProps) => {
  const { currentStyle } = props;
  const value = currentStyle[property]?.value;
  const layerName = useMemo(() => `Scale: ${toValue(value)}`, [value]);

  if (value?.type !== "tuple") {
    return;
  }

  return (
    <FloatingPanel
      title={label}
      content={<TransformPanelContent panel={label} value={value} />}
    >
      <CssValueListItem
        id={label}
        index={index}
        label={<Label truncate>{layerName}</Label>}
      ></CssValueListItem>
    </FloatingPanel>
  );
};

export const ScalePanelContent = (
  props: TransformFloatingPanelContentProps
) => {
  const [scaleX, scaleY] = props.value.value;

  const handlePropertyUpdate = (
    index: number,
    newValue: StyleValue,
    options?: StyleUpdateOptions
  ) => {
    console.log({ index, newValue, options });
  };

  return (
    <Flex>
      <Label> Scale X</Label>
      <CssValueInputContainer
        key="translateX"
        styleSource="local"
        property="outlineOffset"
        value={scaleX}
        keywords={[]}
        setValue={(value, options) => {
          handlePropertyUpdate(0, value, options);
        }}
        deleteProperty={() => {
          handlePropertyUpdate(
            0,
            { type: "unit", value: 0, unit: "px" },
            { isEphemeral: true }
          );
        }}
      />
    </Flex>
  );
};
