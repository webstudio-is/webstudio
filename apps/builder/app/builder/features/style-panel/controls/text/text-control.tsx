import { useState } from "react";
import type { CssProperty, StyleValue } from "@webstudio-is/css-engine";
import { keywordValues } from "@webstudio-is/css-data";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import { deleteProperty, setProperty } from "../../shared/use-style-data";
import {
  $availableUnitVariables,
  useComputedStyleDecl,
} from "../../shared/model";
import { useReadonly } from "../../shared/readonly";

export const TextControl = ({
  property,
  disabled,
}: {
  property: CssProperty;
  disabled?: boolean;
}) => {
  const readonly = useReadonly();
  const computedStyleDecl = useComputedStyleDecl(property);
  const value = computedStyleDecl.cascadedValue;
  const setValue = setProperty(property);
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();
  return (
    <CssValueInput
      styleSource={computedStyleDecl.source.name}
      property={property}
      disabled={disabled || readonly}
      value={value}
      intermediateValue={intermediateValue}
      getOptions={() => [
        ...(keywordValues[property] ?? []).map((value) => ({
          type: "keyword" as const,
          value,
        })),
        ...$availableUnitVariables.get(),
      ]}
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
        setIntermediateValue(undefined);
        setValue(value);
      }}
      onAbort={() => {
        deleteProperty(property, { isEphemeral: true });
      }}
      onReset={() => {
        setIntermediateValue(undefined);
        deleteProperty(property);
      }}
    />
  );
};
