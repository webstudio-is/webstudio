import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import { getFinalValue } from "../../shared/get-final-value";
import { ControlProps } from "../../style-sections";
import type { StyleValue } from "@webstudio-is/css-data";
import { useState } from "react";
import { Box, EnhancedTooltip } from "@webstudio-is/design-system";

export const TextControl = ({
  currentStyle,
  setProperty,
  deleteProperty,
  styleConfig,
  icon,
}: ControlProps & { icon?: JSX.Element }) => {
  const value = getFinalValue({
    currentStyle,
    property: styleConfig.property,
  });

  const setValue = setProperty(styleConfig.property);

  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <EnhancedTooltip content={styleConfig.label}>
      <Box>
        <CssValueInput
          icon={icon}
          property={styleConfig.property}
          value={value}
          intermediateValue={intermediateValue}
          keywords={styleConfig.items.map((item) => ({
            type: "keyword",
            value: item.name,
          }))}
          onChange={(styleValue) => {
            setIntermediateValue(styleValue);

            if (styleValue === undefined) {
              deleteProperty(styleConfig.property, { isEphemeral: true });
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
              deleteProperty(styleConfig.property, { isEphemeral: true });
            }
          }}
          onChangeComplete={({ value }) => {
            setValue(value);
            setIntermediateValue(undefined);
          }}
          onAbort={() => {
            deleteProperty(styleConfig.property, { isEphemeral: true });
          }}
        />
      </Box>
    </EnhancedTooltip>
  );
};
