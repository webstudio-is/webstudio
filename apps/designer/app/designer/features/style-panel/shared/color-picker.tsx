import { useState } from "react";
import { colord, type RgbaColor } from "colord";
import { ColorResult, RGBColor, SketchPicker } from "react-color";
import type { RGBValue } from "@webstudio-is/css-data";

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
  onChange: (value: RGBValue) => void;
  onChangeComplete: (value: RGBValue) => void;
  value: RGBValue;
  id: string;
};

const colorResultToRGBValue = (rgb: RgbaColor | RGBColor): RGBValue => {
  return {
    type: "rgb",
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    alpha: rgb.a ?? 100,
  };
};

export const ColorPicker = ({
  value,
  onChange,
  onChangeComplete,
  id,
}: ColorPickerProps) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false);

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
            color={value}
            onChange={(color: ColorResult) =>
              onChange(colorResultToRGBValue(color.rgb))
            }
            onChangeComplete={(color: ColorResult) => {
              onChangeComplete(colorResultToRGBValue(color.rgb));
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
        const rgb = colord(event.target.value).toRgb();
        // @todo this is not editable, must be the same logic as in CSSValueInput
        // edit then transform on Complete (blur or enter)
        // checking colord .isValid() etc
        onChange(colorResultToRGBValue(rgb));
      }}
      value={toValue(value)}
      id={id}
      prefix={prefix}
    />
  );
};
