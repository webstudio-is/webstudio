import { type ComponentProps, useState } from "react";
import type { StyleValue } from "@webstudio-is/css-engine";
import { Box } from "@webstudio-is/design-system";
import { CssValueInput, type IntermediateStyleValue } from "./css-value-input";
import type { DeleteProperty, SetValue } from "../use-style-data";

type CssValueInputContainerProps = {
  setValue: SetValue;
  deleteProperty: DeleteProperty;
} & Omit<
  ComponentProps<typeof CssValueInput>,
  | "onChange"
  | "onHighlight"
  | "onChangeComplete"
  | "onAbort"
  | "intermediateValue"
>;

export const CssValueInputContainer = ({
  property,
  keywords,
  setValue,
  deleteProperty,
  ...props
}: CssValueInputContainerProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <Box>
      <CssValueInput
        {...props}
        property={property}
        intermediateValue={intermediateValue}
        keywords={keywords}
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
