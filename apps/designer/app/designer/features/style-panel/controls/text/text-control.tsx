import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import { getFinalValue } from "../../shared/get-final-value";
import { ControlProps } from "../../style-sections";
import type { StyleValue } from "@webstudio-is/css-data";
import { useState } from "react";
import { Box, Tooltip } from "@webstudio-is/design-system";

export const TextControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
  icon,
}: ControlProps & { icon?: JSX.Element }) => {
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  const setValue = setProperty(styleConfig.property);

  const [currentValue, setCurrentValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <Tooltip
      content={styleConfig.label}
      delayDuration={600}
      disableHoverableContent={true}
    >
      <Box>
        <CssValueInput
          icon={icon}
          property={styleConfig.property}
          value={currentValue ?? value}
          keywords={styleConfig.items.map((item) => ({
            type: "keyword",
            value: item.name,
          }))}
          onChange={(styleValue) => {
            setCurrentValue(styleValue);
            if (styleValue.type !== "intermediate") {
              setValue(styleValue, { isEphemeral: true });
            }
          }}
          onPreview={(styleValue) => {
            setValue(styleValue, { isEphemeral: true });
          }}
          onChangeComplete={(styleValue) => {
            setValue(styleValue);
            setCurrentValue(undefined);
          }}
        />
      </Box>
    </Tooltip>
  );
};
