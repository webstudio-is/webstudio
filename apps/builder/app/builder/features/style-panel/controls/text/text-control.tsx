import { useState } from "react";
import {
  hyphenateProperty,
  type CssProperty,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
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

export const TextControl = ({
  property,
}: {
  property: StyleProperty | CssProperty;
}) => {
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
      value={value}
      intermediateValue={intermediateValue}
      getOptions={() => [
        ...(keywordValues[hyphenateProperty(property)] ?? []).map((value) => ({
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
