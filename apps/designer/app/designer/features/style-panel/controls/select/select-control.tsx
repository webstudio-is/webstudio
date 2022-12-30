import { toValue } from "@webstudio-is/css-engine";
import { Select } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import { toPascalCase } from "../../shared/keyword-utils";
import { parseCssValue } from "../../shared/parse-css-value";
import type { ControlProps } from "../../style-sections";

export const SelectControl = ({
  property,
  currentStyle,
  setProperty,
  items,
}: ControlProps) => {
  const { items: defaultItems } = styleConfigByName[property];
  const value = currentStyle[property]?.value;
  const setValue = setProperty(property);

  return (
    <Select
      // show empty field instead of radix placeholder
      // like css value input does
      placeholder=""
      options={(items ?? defaultItems).map(({ name }) => name)}
      getLabel={(name) => {
        return toPascalCase(name);
      }}
      value={toValue(value)}
      onChange={(name) => {
        const value = parseCssValue(property, name);
        setValue(value);
      }}
    />
  );
};
