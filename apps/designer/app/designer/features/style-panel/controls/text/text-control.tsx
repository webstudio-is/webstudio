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
  deleteProperty,
  styleConfig,
  icon,
}: ControlProps & { icon?: JSX.Element }) => {
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  const setValue = setProperty(styleConfig.property);

  const [intermediateValue, setIntermediateValue] = useState<
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
          onChangeComplete={({ value, reason }) => {
            setValue(value);
            setIntermediateValue(undefined);
          }}
          onAbort={() => {
            deleteProperty(styleConfig.property, { isEphemeral: true });
          }}
        />
      </Box>
    </Tooltip>
  );
};
