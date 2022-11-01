import { CssValueInput } from "../../shared/css-value-input";
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

  const [currentValue, setCurrentValue] = useState<StyleValue>();

  return (
    <CssValueInput
      property={styleConfig.property}
      value={currentValue ?? value}
      keywords={styleConfig.items.map((item) => ({
        type: "keyword",
        value: item.name,
      }))}
      onChange={(styleValue) => {
        setCurrentValue(styleValue);
        setValue(toValue(styleValue), { isEphemeral: true });
      }}
      onItemHighlight={(styleValue) => {
        const nextValue = styleValue ?? currentValue ?? value;
        if (nextValue) {
          setValue(toValue(nextValue), {
            isEphemeral: true,
          });
        }
      }}
      onChangeComplete={(styleValue) => {
        const prevValue = toValue(value);
        const nextValue = toValue(styleValue);
        if (prevValue === nextValue) return;
        setCurrentValue(undefined);
        setValue(toValue(styleValue));
      }}
    />
  );
};
