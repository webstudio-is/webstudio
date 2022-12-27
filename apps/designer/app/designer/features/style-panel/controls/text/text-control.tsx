import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import { ControlProps } from "../../style-sections";
import type { StyleValue } from "@webstudio-is/css-data";
import { useState } from "react";
import { Box, EnhancedTooltip } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";

export const TextControl = ({
  property,
  items,
  currentStyle,
  setProperty,
  deleteProperty,
  icon,
}: ControlProps & { icon?: JSX.Element }) => {
  const { label, items: defaultItems } = styleConfigByName[property];
  const value = currentStyle[property]?.value;

  const setValue = setProperty(property);

  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <EnhancedTooltip content={label}>
      <Box>
        <CssValueInput
          icon={icon}
          property={property}
          value={value}
          intermediateValue={intermediateValue}
          keywords={(items ?? defaultItems).map((item) => ({
            type: "keyword",
            value: item.name,
          }))}
          onChange={(styleValue) => {
            setIntermediateValue(styleValue);

            if (styleValue === undefined) {
              deleteProperty(property, { isEphemeral: true });
              return;
            }

            if (styleValue.type !== "intermediate") {
              setValue(styleValue, { isEphemeral: true });
            }
          }}
          onHighlight={(styleValue) => {
            if (styleValue !== undefined) {
              setValue(styleValue, { isEphemeral: true });
            } else {
              deleteProperty(property, { isEphemeral: true });
            }
          }}
          onChangeComplete={({ value }) => {
            setValue(value);
            setIntermediateValue(undefined);
          }}
          onAbort={() => {
            deleteProperty(property, { isEphemeral: true });
          }}
        />
      </Box>
    </EnhancedTooltip>
  );
};
