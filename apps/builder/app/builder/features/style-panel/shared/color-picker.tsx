import { useState } from "react";
import {
  toValue,
  type StyleValue,
  type KeywordValue,
  type VarValue,
  type CssProperty,
} from "@webstudio-is/css-engine";
import { Box, ColorPickerPopover } from "@webstudio-is/design-system";
import { CssValueInput } from "./css-value-input";
import type { IntermediateStyleValue } from "./css-value-input/css-value-input";

type ColorPickerProps = {
  onChange: (value: StyleValue) => void;
  onChangeComplete: (value: StyleValue) => void;
  onReset: () => void;
  onAbort: () => void;
  value: StyleValue;
  currentColor: StyleValue;
  getOptions?: () => Array<KeywordValue | VarValue>;
  property: CssProperty;
  disabled?: boolean;
};

export const ColorPickerControl = ({
  value,
  currentColor,
  getOptions,
  property,
  disabled,
  onChange,
  onChangeComplete,
  onAbort,
  onReset,
}: ColorPickerProps) => {
  const [intermediateValue, setIntermediateValue] = useState<
    StyleValue | IntermediateStyleValue
  >();

  return (
    <CssValueInput
      aria-disabled={disabled}
      styleSource="default"
      prefix={
        <Box css={{ paddingLeft: 2 }}>
          <ColorPickerPopover
            value={currentColor}
            onChange={(styleValue) => {
              setIntermediateValue(styleValue);
              if (styleValue) {
                onChange(styleValue);
              } else {
                onAbort();
              }
            }}
            onChangeComplete={(value) => {
              setIntermediateValue(undefined);
              onChangeComplete(value);
            }}
          />
        </Box>
      }
      showSuffix={false}
      property={property}
      value={value}
      intermediateValue={intermediateValue}
      getOptions={getOptions}
      onChange={(styleValue) => {
        if (styleValue === undefined) {
          setIntermediateValue(styleValue);
          onAbort();
          return;
        }
        if (styleValue.type === "intermediate") {
          setIntermediateValue(styleValue);
          return;
        }
        if (
          styleValue.type === "rgb" ||
          styleValue.type === "color" ||
          styleValue.type === "keyword" ||
          styleValue.type === "var" ||
          styleValue.type === "invalid"
        ) {
          setIntermediateValue(styleValue);
          onChange(styleValue);
          return;
        }

        setIntermediateValue({
          type: "intermediate",
          value: toValue(styleValue),
        });
      }}
      onHighlight={(styleValue) => {
        if (styleValue) {
          onChange(styleValue);
        } else {
          onAbort();
        }
      }}
      onChangeComplete={({ value }) => {
        if (
          value.type === "rgb" ||
          value.type === "color" ||
          value.type === "keyword" ||
          value.type === "var"
        ) {
          setIntermediateValue(undefined);
          onChangeComplete(value);
          return;
        }
        // In case value is parsed to something wrong
        const invalidValue: StyleValue = {
          type: "invalid",
          value: toValue(value),
        };
        setIntermediateValue(invalidValue);
        onChange(invalidValue);
      }}
      onAbort={onAbort}
      onReset={() => {
        setIntermediateValue(undefined);
        onReset();
      }}
    />
  );
};
