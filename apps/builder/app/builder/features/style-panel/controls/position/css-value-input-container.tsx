import { ComponentProps, useState } from "react";
import type { StyleValue, StyleProperty } from "@webstudio-is/css-data";
import { Box, EnhancedTooltip } from "@webstudio-is/design-system";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import type { StyleSource } from "../../shared/style-info";
import type { DeleteProperty, SetValue } from "../../shared/use-style-data";

type CssValueInputContainerProps = {
  property: StyleProperty;
  keywords: ComponentProps<typeof CssValueInput>["keywords"];
  label: string;
  styleSource: StyleSource;
  value?: StyleValue;
  setValue: SetValue;
  deleteProperty: DeleteProperty;
  disabled?: boolean;
  icon?: JSX.Element;
};

export const CssValueInputContainer = ({
  property,
  keywords,
  label,
  styleSource,
  value,
  setValue,
  deleteProperty,
  disabled,
  icon,
}: CssValueInputContainerProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <EnhancedTooltip content={label}>
      <Box>
        <CssValueInput
          icon={icon}
          disabled={disabled}
          styleSource={styleSource}
          property={property}
          value={value}
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
    </EnhancedTooltip>
  );
};
