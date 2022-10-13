import { CssValueInput } from "~/designer/features/style-panel/shared/css-value-input/css-value-input";
import { getFinalValue } from "../../shared/get-final-value";
import { ControlProps } from "../../style-sections";
import { toValue } from "@webstudio-is/react-sdk";

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

  return (
    <CssValueInput
      property={styleConfig.property}
      value={value}
      keywords={styleConfig.items.map((item) => ({
        type: "keyword",
        value: item.name,
      }))}
      onChange={(styleValue) => {
        setValue(toValue(styleValue), { isEphemeral: true });
      }}
      onChangeComplete={(styleValue) => {
        setValue(toValue(styleValue));
      }}
    />
  );
};
