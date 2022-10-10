import { CssValueInput } from "~/designer/features/style-panel/controls/css-property/css-property";
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
      allowedValues={styleConfig.items.map((item) => ({
        type: "keyword",
        value: item.name,
      }))}
      onChange={(value) => {
        console.log("change", value);
        handleChange(value, true);
      }}
      onChangeComplete={(value) => {
        console.log("change complete", value);
        handleChange(value, false);
      }}
    />
  );
};
