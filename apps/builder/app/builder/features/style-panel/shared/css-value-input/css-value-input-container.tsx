import { type ComponentProps, useState } from "react";
import type { StyleValue } from "@webstudio-is/css-engine";
import { CssValueInput, type IntermediateStyleValue } from "./css-value-input";
import type { DeleteProperty, SetValue } from "../use-style-data";

type CssValueInputContainerProps = {
  setValue: SetValue;
  deleteProperty: DeleteProperty;
} & Omit<
  ComponentProps<typeof CssValueInput>,
  | "onChange"
  | "onHighlight"
  | "onReset"
  | "onAbort"
  | "intermediateValue"
  | "onChangeComplete"
> & {
    onChangeComplete?: ComponentProps<typeof CssValueInput>["onChangeComplete"];
    onReset?: ComponentProps<typeof CssValueInput>["onReset"];
  };

export const CssValueInputContainer = ({
  property,
  setValue,
  deleteProperty,
  onChangeComplete,
  onReset,
  ...props
}: CssValueInputContainerProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      {...props}
      property={property}
      intermediateValue={intermediateValue}
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
      onChangeComplete={(event) => {
        setValue(event.value);
        setIntermediateValue(undefined);
        onChangeComplete?.(event);
      }}
      onAbort={() => {
        deleteProperty(property, { isEphemeral: true });
      }}
      onReset={() => {
        setIntermediateValue(undefined);
        deleteProperty(property);
        onReset?.();
      }}
    />
  );
};
