import { declarationDescriptions, parseCssValue } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
import { Box, Select, theme } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import { toKebabCase } from "../../shared/keyword-utils";
import type { ControlProps } from "../types";

export const SelectControl = ({
  property,
  currentStyle,
  setProperty,
  deleteProperty,
  items,
  isAdvanced,
}: ControlProps) => {
  const { items: defaultItems } = styleConfigByName(property);
  const styleValue = currentStyle[property]?.value;
  const setValue = setProperty(property);
  const options = (items ?? defaultItems).map(({ name }) => name);
  // We can't render an empty string as a value when display was added but without a value.
  // One case is when advanced property is being added, but no value is set.
  const value = toValue(styleValue) || "empty";

  // Append selected value when not present in the list of options
  // because radix requires values to always be in the list.
  if (options.includes(value) === false) {
    options.push(value);
  }

  return (
    <Select
      disabled={isAdvanced}
      // Show empty field instead of radix placeholder like css value input does.
      placeholder=""
      options={options}
      getLabel={toKebabCase}
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
          deleteProperty(property, { isEphemeral: true });
        }
      }}
      getDescription={(option) => {
        const description =
          declarationDescriptions[
            `${property}:${option}` as keyof typeof declarationDescriptions
          ];

        if (description === undefined) {
          return;
        }
        return <Box css={{ width: theme.spacing[26] }}>{description}</Box>;
      }}
      getItemProps={() => ({ text: "sentence" })}
    />
  );
};
