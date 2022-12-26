import { toValue } from "@webstudio-is/css-engine";
import { Select } from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";

export const SelectControl = ({
  property,
  currentStyle,
  setProperty,
  items,
}: ControlProps) => {
  const value = currentStyle[property];

  const setValue = setProperty(property);

  return (
    <Select
      // show empty field instead of radix placeholder
      // like css value input does
      placeholder=""
      options={items.map(({ label }) => label)}
      value={toValue(value)}
      onChange={setValue}
    />
  );
};
