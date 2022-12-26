import { toValue } from "@webstudio-is/css-engine";
import { Select } from "@webstudio-is/design-system";
import { getFinalValue } from "../../shared/get-final-value";
import type { ControlProps } from "../../style-sections";

export const SelectControl = ({
  currentStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    property: styleConfig.property,
  });

  const setValue = setProperty(styleConfig.property);

  return (
    <Select
      // show empty field instead of radix placeholder
      // like css value input does
      placeholder=""
      options={styleConfig.items.map(({ label }) => label)}
      value={toValue(value)}
      onChange={setValue}
    />
  );
};
