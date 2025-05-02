import { type ComponentProps, useState } from "react";
import type { StyleValue } from "@webstudio-is/css-engine";
import { CssValueInput, type IntermediateStyleValue } from "./css-value-input";
import type { StyleUpdateOptions } from "../use-style-data";

type CssValueInputContainerProps = Omit<
  ComponentProps<typeof CssValueInput>,
  | "onChange"
  | "onHighlight"
  | "onReset"
  | "onAbort"
  | "intermediateValue"
  | "onChangeComplete"
  | "setProperty"
> & {
  onUpdate: (style: StyleValue, options?: StyleUpdateOptions) => void;
  onDelete: (options?: StyleUpdateOptions) => void;
  onChangeComplete?: ComponentProps<typeof CssValueInput>["onChangeComplete"];
  onReset?: ComponentProps<typeof CssValueInput>["onReset"];
};

export const CssValueInputContainer = ({
  property,
  onUpdate,
  onDelete,
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
          onDelete({ isEphemeral: true });
          return;
        }

        if (styleValue.type !== "intermediate") {
          onUpdate(styleValue, { isEphemeral: true });
        }
      }}
      onHighlight={(styleValue) => {
        if (styleValue !== undefined) {
          onUpdate(styleValue, { isEphemeral: true });
        } else {
          onDelete({ isEphemeral: true });
        }
      }}
      onChangeComplete={(event) => {
        onUpdate(event.value);
        setIntermediateValue(undefined);
        onChangeComplete?.(event);
      }}
      onAbort={() => {
        onDelete({ isEphemeral: true });
      }}
      onReset={() => {
        setIntermediateValue(undefined);
        onDelete();
        onReset?.();
      }}
    />
  );
};
