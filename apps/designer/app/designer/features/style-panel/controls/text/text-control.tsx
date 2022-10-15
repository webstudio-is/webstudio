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

  const [ephemeralValue, setEphemeralValue] = useState<StyleValue | null>(null);

  return (
    <CssValueInput
      property={styleConfig.property}
      value={ephemeralValue ?? value}
      keywords={styleConfig.items.map((item) => ({
        type: "keyword",
        value: item.name,
      }))}
      onChange={(styleValue) => {
        setEphemeralValue(styleValue);
        setValue(toValue(styleValue), { isEphemeral: true });
      }}
      onItemHighlight={(styleValue) => {
        const nextValue = styleValue ?? ephemeralValue ?? value;
        if (nextValue) {
          setValue(toValue(nextValue), {
            isEphemeral: true,
          });
        }
      }}
      onChangeComplete={(styleValue) => {
        setEphemeralValue(null);
        setValue(toValue(styleValue));
      }}
    />
  );
};
