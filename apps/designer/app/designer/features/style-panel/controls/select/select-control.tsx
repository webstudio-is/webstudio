import { Select } from "@webstudio-is/design-system";
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

  if (value === undefined) {
    return null;
  }

  const setValue = setProperty(styleConfig.property);

  return (
    <Select
      options={styleConfig.items.map(({ label }) => label)}
      value={String(value.value)}
      onChange={setValue}
    />
  );
};
