import { useState } from "react";
import { colord, type RgbaColor } from "colord";
import { ColorResult, RGBColor, SketchPicker } from "react-color";
import type { RgbValue } from "@webstudio-is/css-data";

import {
  Box,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverPortal,
  TextField,
  css,
} from "@webstudio-is/design-system";
import { toValue } from "@webstudio-is/css-engine";

const pickerStyle = css({
  padding: "$spacing$5",
  background: "$panel",
  // @todo this lib doesn't have another way to define styles for inputs
  // we should either submit a PR or replace it
  "& input": {
    color: "$hiContrast",
    background: "$loContrast",
  },
});

const defaultPickerStyles = {
  default: {
    // Workaround to allow overrides using className
    picker: { padding: "", background: "" },
  },
};

type ColorPickerProps = {
  onChange: (value: RgbValue) => void;
  onChangeComplete: (value: RgbValue) => void;
  value: RgbValue;
  id: string;
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
  onChange,
  onChangeComplete,
  id,
}: ColorPickerProps) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const [intermediateValue, setIntermediateValue] = useState<
    | {
        /**
         * TextField value
         */
        stringValue: string;
        /**
         * Color picker value
         */
        rgbValue: RGBColor;
        state: "invalid" | undefined;
      }
    | undefined
  >(undefined);

  const onInputChangeComplete = (source: "enter" | "blur") => {
    if (intermediateValue === undefined) {
      return;
    }

    const colordValue = colord(intermediateValue.stringValue);
    if (colordValue.isValid()) {
      const rgb = colordValue.toRgb();
      onChangeComplete({
        type: "rgb",
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        alpha: rgb.a,
      });
      setIntermediateValue(undefined);
      return;
    }

    // We don't store invalid values in the CSS data, below is the only way we can show errors.
    // See for details: https://github.com/webstudio-is/webstudio-designer/issues/564
    // Anyway same behavior has Webflow - shows an error state on "Enter", and resets on Blur

    // In case of "Enter" click show that the value is invalid
    if (source === "enter") {
      setIntermediateValue({
        ...intermediateValue,
        state: "invalid",
      });
      return;
    }

    // In case of blur, just reset to external value
    setIntermediateValue(undefined);
  };

  const stringValue = intermediateValue?.stringValue ?? toValue(value);
  const rgbValue = intermediateValue?.rgbValue ?? rgbValueToRgbColor(value);

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
            margin: "$spacing$3",
            width: "$spacing$10",
            height: "$spacing$10",
            borderRadius: 2,
            background: toValue(value),
          }}
        />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent>
          <SketchPicker
            color={rgbValue}
            onChange={(color: ColorResult) => {
              setIntermediateValue({
                stringValue: toValue(colorResultToRgbValue(color.rgb)),
                rgbValue: color.rgb,
                state: undefined,
              });
              onChange(colorResultToRgbValue(color.rgb));
            }}
            onChangeComplete={(color: ColorResult) => {
              setIntermediateValue(undefined);
              onChangeComplete(colorResultToRgbValue(color.rgb));
            }}
            // @todo to remove both when we have preset colors
            presetColors={[]}
            className={pickerStyle()}
            styles={defaultPickerStyles}
          />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );

  return (
    <TextField
      onChange={(event) => {
        setIntermediateValue({
          stringValue: event.target.value,
          rgbValue: rgbValue,
          state: undefined,
        });
      }}
      onBlur={() => {
        if (displayColorPicker) {
          return;
        }
        onInputChangeComplete("blur");
      }}
      value={stringValue}
      state={intermediateValue?.state}
      id={id}
      prefix={prefix}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onInputChangeComplete("enter");
        }
      }}
    />
  );
};
