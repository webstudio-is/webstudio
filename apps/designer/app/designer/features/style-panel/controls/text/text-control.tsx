import { CssValueInput } from "~/designer/features/style-panel/shared/css-value-input/css-value-input";
import { getFinalValue } from "../../shared/get-final-value";
import { ControlProps } from "../../style-sections";
import { StyleValue } from "@webstudio-is/react-sdk";

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

  const handleChange = (
    styleValue: StyleValue | undefined,
    isEphemeral: boolean
  ) => {
    if (styleValue === undefined) {
      setValue("");
      return;
    }
    const { value, type } = styleValue;
    const newValue =
      type === "unit" ? `${value}${styleValue.unit}` : `${value}`;
    setValue(newValue, { isEphemeral });
  };

  return (
    <CssValueInput
      property={styleConfig.property}
      value={value}
      items={styleConfig.items.map((item) => ({
        type: "keyword",
        value: item.name,
      }))}
      onChange={(value) => {
        handleChange(value, true);
      }}
      onChangeComplete={(value) => {
        handleChange(value, false);
      }}
    />
  );
};
