import {
  camelCaseProperty,
  declarationDescriptions,
  parseCssValue,
} from "@webstudio-is/css-data";
import {
  StyleValue,
  toValue,
  type CssProperty,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { Box, Select, theme } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import { toKebabCase } from "../../shared/keyword-utils";
import { useComputedStyleDecl } from "../../shared/model";
import {
  resetEphemeralStyles,
  setProperty,
  type StyleUpdateOptions,
} from "../../shared/use-style-data";
import {
  getRepeatedStyleItem,
  setRepeatedStyleItem,
} from "../../shared/repeated-style";
import { noCase } from "change-case";

export const SelectControl = ({
  property,
  index,
  items = styleConfigByName(property).items,
}: {
  property: StyleProperty | CssProperty;
  index?: number;
  items?: Array<{ label: string; name: string }>;
}) => {
  const styleDecl = useComputedStyleDecl(property);
  const value =
    index === undefined
      ? styleDecl.cascadedValue
      : getRepeatedStyleItem(styleDecl, index);
  const setValue = (value: StyleValue, options?: StyleUpdateOptions) => {
    if (index === undefined) {
      setProperty(property)(value, options);
    } else {
      setRepeatedStyleItem(styleDecl, index, value, options);
    }
  };
  const options = items.map(({ name }) => name);
  // We can't render an empty string as a value when display was added but without a value.
  // One case is when advanced property is being added, but no value is set.
  const valueString = toValue(value) || "empty";

  // Append selected value when not present in the list of options
  // because radix requires values to always be in the list.
  if (options.includes(valueString) === false) {
    options.push(valueString);
  }

  const hasDescription =
    options.length > 0 &&
    options.some(
      (option) =>
        declarationDescriptions[`${camelCaseProperty(property)}:${option}`] !==
        undefined
    );

  return (
    <Select
      // Show empty field instead of radix placeholder like css value input does.
      placeholder=""
      options={options}
      getLabel={toKebabCase}
      value={valueString}
      onChange={(name) => setValue({ type: "keyword", value: name })}
      onItemHighlight={(name) => {
        // Remove preview when mouse leaves the item.
        if (name === undefined) {
          if (value) {
            setValue(value, { isEphemeral: true });
          }
          return;
        }
        // Preview on mouse enter or focus.
        const nextValue = parseCssValue(camelCaseProperty(property), name);
        setValue(nextValue, { isEphemeral: true });
      }}
      onOpenChange={(isOpen) => {
        // Remove ephemeral changes when closing the menu.
        if (isOpen === false) {
          resetEphemeralStyles();
        }
      }}
      getDescription={(option) => {
        if (hasDescription === false) {
          return;
        }

        const description =
          declarationDescriptions[`${camelCaseProperty(property)}:${option}`];
        return (
          <Box css={{ width: theme.spacing[26] }}>
            {description ?? `The ${noCase(property)} is ${option}`}
          </Box>
        );
      }}
      getItemProps={() => ({ text: "sentence" })}
    />
  );
};
