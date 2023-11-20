import { toValue } from "@webstudio-is/css-engine";
import { Select } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import { toPascalCase } from "../../shared/keyword-utils";
import { parseCssValue } from "@webstudio-is/css-data";
import type { ControlProps } from "../../style-sections";

export const SelectControl = ({
  property,
  currentStyle,
  setProperty,
  items,
}: ControlProps) => {
  const { items: defaultItems } = styleConfigByName(property);
  const styleValue = currentStyle[property]?.value;
  const setValue = setProperty(property);
  const options = (items ?? defaultItems).map(({ name }) => name);
  const value = toValue(styleValue);
  // Append selected value when not present in the list of options
  // because radix requires values to always be in the list.
  if (options.includes(value) === false) {
    options.push(value);
  }

  return (
    <Select
      // Show empty field instead of radix placeholder like css value input does.
      placeholder=""
      options={options}
      getLabel={toPascalCase}
      value={value}
      onChange={(name) => {
        const nextValue = parseCssValue(property, name);
        setValue(nextValue);
      }}
      onItemHighlight={(name) => {
        // Remove preview when mouse leaves the item.
        if (name === undefined) {
          if (styleValue !== undefined) {
            setValue(styleValue, { isEphemeral: true });
          }
          return;
        }
        // Preview on mouse enter or focus.
        const nextValue = parseCssValue(property, name);
        setValue(nextValue, { isEphemeral: true });
      }}
      onOpenChange={(isOpen) => {
        // Remove ephemeral changes when closing the menu.
        if (isOpen === false && styleValue !== undefined) {
          setValue(styleValue, { isEphemeral: true });
        }
      }}
    />
  );
};
