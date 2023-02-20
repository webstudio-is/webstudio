import { useState } from "react";
// import { colord, type RgbaColor } from "colord";
import type { RgbaColor } from "colord";
import { ColorResult, RGBColor, SketchPicker } from "react-color";
import type {
  KeywordValue,
  RgbValue,
  StyleProperty,
  StyleValue,
} from "@webstudio-is/css-data";

import {
  Box,
  DeprecatedPopover,
  DeprecatedPopoverTrigger,
  DeprecatedPopoverContent,
  DeprecatedPopoverPortal,
  css,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";
import { theme } from "@webstudio-is/design-system";
import type { StyleSource } from "./style-info";
import { CssValueInput } from "./css-value-input";
import type { CssValueInputValue } from "./css-value-input/css-value-input";

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

type ColorPickerProps = {
  onChange: (value: CssValueInputValue | undefined) => void;
  onChangeComplete: (event: { value: StyleValue }) => void;
  onHighlight: (value: StyleValue | undefined) => void;
  onAbort: () => void;
  intermediateValue: CssValueInputValue | undefined;
  value: RgbValue;
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

const rgbValueToRgbColor = (rgb: RgbValue): RGBColor => {
  return {
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    a: rgb.alpha,
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

  // const stringValue = intermediateValue?.stringValue ?? toValue(value);
  const rgbValue = rgbValueToRgbColor(value);

  const prefix = (
    <DeprecatedPopover
      modal
      open={displayColorPicker}
      onOpenChange={setDisplayColorPicker}
    >
      <DeprecatedPopoverTrigger
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
            background: toValue(value),
          }}
        />
      </DeprecatedPopoverTrigger>
      <DeprecatedPopoverPortal>
        <DeprecatedPopoverContent>
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
        </DeprecatedPopoverContent>
      </DeprecatedPopoverPortal>
    </DeprecatedPopover>
  );

  return (
    <CssValueInput
      styleSource={styleSource}
      icon={prefix}
      property={property}
      value={value}
      intermediateValue={intermediateValue}
      keywords={keywords}
      onChange={onChange}
      onHighlight={onHighlight}
      onChangeComplete={onChangeComplete}
      onAbort={onAbort}
    />
  );
};
