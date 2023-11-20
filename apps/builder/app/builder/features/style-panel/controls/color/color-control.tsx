import { Flex } from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import type { ControlProps } from "../../style-sections";
import {
  type CssColorPickerValueInput,
  ColorPicker,
} from "../../shared/color-picker";
import { colord } from "colord";
import { getStyleSource } from "../../shared/style-info";
import { styleConfigByName } from "../../shared/configs";
import { useState } from "react";
import type { RgbValue, StyleValue } from "@webstudio-is/css-engine";

const parseColor = (color?: StyleValue): RgbValue => {
  const colordValue = colord(toValue(color));

  if (colordValue.isValid()) {
    const rgb = colordValue.toRgb();
    return {
      type: "rgb",
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      alpha: rgb.a ?? 1,
    };
  }

  // @todo what to show as default?
  // Default to black
  return {
    type: "rgb",
    r: 0,
    g: 0,
    b: 0,
    alpha: 1,
  };
};

export const ColorControl = ({
  property,
  items,
  currentStyle,
  setProperty,
  deleteProperty,
}: ControlProps) => {
  const [intermediateValue, setIntermediateValue] =
    useState<CssColorPickerValueInput>();

  const { items: defaultItems } = styleConfigByName(property);
  const styleInfo = currentStyle[property];

  let value = currentStyle[property]?.value ?? {
    type: "keyword" as const,
    value: "black",
  };

  const setValue = setProperty(property);

  if (value.type !== "rgb" && value.type !== "keyword") {
    // Support previously set colors
    value = parseColor(value);
  }

  const currentColor = parseColor(currentStyle["color"]?.currentColor);

  return (
    <Flex align="center" gap="1">
      <ColorPicker
        currentColor={currentColor}
        property={property}
        value={value}
        styleSource={getStyleSource(styleInfo)}
        keywords={(items ?? defaultItems).map((item) => ({
          type: "keyword",
          value: item.name,
        }))}
        intermediateValue={intermediateValue}
        onChange={(styleValue) => {
          setIntermediateValue(styleValue);

          if (styleValue === undefined) {
            deleteProperty(property, { isEphemeral: true });
            return;
          }

          if (styleValue.type !== "intermediate") {
            setValue(styleValue, { isEphemeral: true });
          }
        }}
        onHighlight={(styleValue) => {
          if (styleValue !== undefined) {
            setValue(styleValue, { isEphemeral: true });
          } else {
            deleteProperty(property, { isEphemeral: true });
          }
        }}
        onChangeComplete={({ value }) => {
          setValue(value);
          setIntermediateValue(undefined);
        }}
        onAbort={() => {
          deleteProperty(property, { isEphemeral: true });
        }}
      />
    </Flex>
  );
};
