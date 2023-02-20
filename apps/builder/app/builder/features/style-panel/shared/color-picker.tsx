import { useState } from "react";
import { colord, extend, RgbaColor } from "colord";
// eslint-disable-next-line import/no-internal-modules
import namesPlugin from "colord/plugins/names";

import { ColorResult, RGBColor, SketchPicker } from "react-color";
import type {
  InvalidValue,
  KeywordValue,
  RgbValue,
  StyleProperty,
  StyleValue,
} from "@webstudio-is/css-data";

import {
  Box,
  Popover,
  PopoverTrigger,
  PopoverContent,
  css,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { theme } from "@webstudio-is/design-system";
import type { StyleSource } from "./style-info";
import { CssValueInput } from "./css-value-input";
import type { IntermediateStyleValue } from "./css-value-input/css-value-input";

// To support color names
extend([namesPlugin]);

const pickerStyle = css({
  padding: theme.spacing[5],
  background: theme.colors.panel,
  // @todo this lib doesn't have another way to define styles for inputs
  // we should either submit a PR or replace it
  "& input": {
    color: theme.colors.hiContrast,
    background: theme.colors.loContrast,
  },
});

const defaultPickerStyles = {
  default: {
    // Workaround to allow overrides using className
    picker: { padding: "", background: "" },
  },
};

export type CssColorPickerValueInput =
  | RgbValue
  | KeywordValue
  | IntermediateStyleValue;

type ColorPickerProps = {
  onChange: (value: CssColorPickerValueInput | undefined) => void;
  onChangeComplete: (event: {
    value: RgbValue | KeywordValue | InvalidValue;
  }) => void;
  onHighlight: (value: StyleValue | undefined) => void;
  onAbort: () => void;
  intermediateValue: CssColorPickerValueInput | undefined;
  value: RgbValue | KeywordValue;
  styleSource: StyleSource;
  keywords?: Array<KeywordValue>;
  property: StyleProperty;
};

const colorResultToRgbValue = (rgb: RgbaColor | RGBColor): RgbValue => {
  return {
    type: "rgb",
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    alpha: rgb.a ?? 1,
  };
};

const styleValueToRgbColor = (value: CssColorPickerValueInput): RGBColor => {
  const color = colord(
    value.type === "intermediate" ? value.value : toValue(value)
  ).toRgb();

  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: color.a,
  };
};

export const ColorPicker = ({
  value,
  intermediateValue,
  onChange,
  onChangeComplete,
  onHighlight,
  onAbort,
  styleSource,
  keywords,
  property,
}: ColorPickerProps) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false);

  const rgbValue = styleValueToRgbColor(intermediateValue ?? value);

  // @todo transparent icon can be better
  const background =
    rgbValue.a === 0
      ? "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 33.33% 33.33%"
      : toValue(value);

  const prefix = (
    <Popover
      modal
      open={displayColorPicker}
      onOpenChange={setDisplayColorPicker}
    >
      <PopoverTrigger
        asChild
        aria-label="Open color picker"
        onClick={() => setDisplayColorPicker((shown) => !shown)}
      >
        <Box
          css={{
            margin: theme.spacing[3],
            width: theme.spacing[10],
            height: theme.spacing[10],
            borderRadius: 2,
            background,
          }}
        />
      </PopoverTrigger>

      <PopoverContent>
        <SketchPicker
          color={rgbValue}
          onChange={(color: ColorResult) => {
            onChange(colorResultToRgbValue(color.rgb));
          }}
          onChangeComplete={(color: ColorResult) => {
            onChangeComplete({
              value: colorResultToRgbValue(color.rgb),
            });
          }}
          // @todo to remove both when we have preset colors
          presetColors={[]}
          className={pickerStyle()}
          styles={defaultPickerStyles}
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <CssValueInput
      styleSource={styleSource}
      icon={prefix}
      property={property}
      value={value}
      intermediateValue={intermediateValue}
      keywords={keywords}
      onChange={(styleValue) => {
        if (
          styleValue?.type === "rgb" ||
          styleValue?.type === "keyword" ||
          styleValue?.type === "intermediate" ||
          styleValue === undefined
        ) {
          onChange(styleValue);
          return;
        }

        onChange({
          type: "intermediate",
          value: toValue(styleValue),
        });
      }}
      onHighlight={onHighlight}
      onChangeComplete={({ value }) => {
        if (
          value.type === "rgb" ||
          value.type === "keyword" ||
          value.type === "invalid"
        ) {
          onChangeComplete({ value });
        }

        onChangeComplete({
          value: {
            type: "invalid",
            value: toValue(value),
          },
        });
      }}
      onAbort={onAbort}
    />
  );
};
