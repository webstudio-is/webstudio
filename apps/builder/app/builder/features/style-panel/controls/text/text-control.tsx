import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import type { ControlProps } from "../../style-sections";
import type { StyleValue } from "@webstudio-is/css-data";
import { useState } from "react";
import { Box } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import { getStyleSource } from "../../shared/style-info";

export const TextControl = ({
  property,
  items,
  currentStyle,
  setProperty,
  deleteProperty,
  icon,
  disabled,
}: ControlProps & { icon?: JSX.Element }) => {
  const { items: defaultItems } = styleConfigByName(property);
  const styleInfo = currentStyle[property];
  const value = styleInfo?.value;

  const setValue = setProperty(property);

  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <Box>
      <CssValueInput
        disabled={disabled}
        styleSource={getStyleSource(styleInfo)}
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
  );
};
