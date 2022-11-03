import { Select } from "@webstudio-is/design-system";
import { useMemo } from "react";
import { getFinalValue } from "../../shared/get-final-value";
import type { ControlProps } from "../../style-sections";

export const SelectControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  const [options, selectedOption] = useMemo(() => {
    const item = styleConfig.items.find((item) => item.name == value?.value);
    const options = styleConfig.items.map((item) => item.label);
    return [options, item?.label];
  }, [value?.value, styleConfig.items]);

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={(option) => {
        const item = styleConfig.items.find((item) => item.label == option);
        if (item) {
          setValue(item.name);
        }
      }}
      ghost
      css={{
        // @todo this shouldn't be in design system by default
        gap: "calc($sizes$1 / 2)",
        paddingLeft: "calc($sizes$4 / 2)",
        height: "calc($sizes$5 + $sizes$1)",
        boxShadow: "inset 0 0 0 1px $colors$slate7",
        textTransform: "capitalize",
        fontWeight: "inherit",
        "&:hover": { background: "none" },
      }}
    />
  );
};
