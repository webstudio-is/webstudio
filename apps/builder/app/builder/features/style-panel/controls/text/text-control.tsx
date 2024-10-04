import { useState } from "react";
import { useStore } from "@nanostores/react";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import {
  CssValueInput,
  type IntermediateStyleValue,
} from "../../shared/css-value-input";
import { styleConfigByName } from "../../shared/configs";
import { deleteProperty, setProperty } from "../../shared/use-style-data";
import { $availableVariables, useComputedStyleDecl } from "../../shared/model";

export const TextControl = ({ property }: { property: StyleProperty }) => {
  const computedStyleDecl = useComputedStyleDecl(property);
  const value = computedStyleDecl.cascadedValue;
  const setValue = setProperty(property);
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();
  const items = styleConfigByName(property).items;
  const availableVariables = useStore($availableVariables);
  return (
    <CssValueInput
      styleSource={computedStyleDecl.source.name}
      property={property}
      value={value}
      intermediateValue={intermediateValue}
      options={[
        ...items.map((item) => ({
          type: "keyword" as const,
          value: item.name,
        })),
        ...availableVariables,
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
    />
  );
};
