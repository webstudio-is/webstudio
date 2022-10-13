import { CssValueInput } from "~/designer/features/style-panel/shared/css-value-input/css-value-input";
import { getFinalValue } from "../../shared/get-final-value";
import { ControlProps } from "../../style-sections";
import { type StyleValue, toValue } from "@webstudio-is/react-sdk";
import { useState } from "react";

export const TextControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  const setValue = setProperty(styleConfig.property);

  const [tempValue, setTempValue] = useState<StyleValue>();

  return (
    <CssValueInput
      property={styleConfig.property}
      value={tempValue ?? value}
      keywords={styleConfig.items.map((item) => ({
        type: "keyword",
        value: item.name,
      }))}
      onChange={(styleValue) => {
        setTempValue(styleValue);
        setValue(toValue(styleValue), { isEphemeral: true });
      }}
      onChangeComplete={(styleValue) => {
        setTempValue(undefined);
        setValue(toValue(styleValue));
      }}
    />
  );
};
