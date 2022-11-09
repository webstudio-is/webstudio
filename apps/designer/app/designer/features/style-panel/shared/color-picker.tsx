import { useState } from "react";
import { ColorResult, RGBColor, SketchPicker } from "react-color";
import {
  Box,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverPortal,
  TextField,
  css,
} from "@webstudio-is/design-system";

const stringifyRGBA = (color: RGBColor) => {
  const { r, g, b, a = 1 } = color;

  return `rgba(${r},${g},${b},${a})`;
};

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
  onChange: (value: string) => void;
  onChangeComplete: (value: string) => void;
  value: string;
  id: string;
};

export const ColorPicker = ({
  value,
  onChange,
  onChangeComplete,
  id,
}: ColorPickerProps) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  // Color picker will use 0 as alpha value, which will force user to set alpha every time they have to change from transparent
  if (value === "transparent") value = "";

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
            background: value,
          }}
        />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent>
          <SketchPicker
            color={value}
            onChange={(color: ColorResult) =>
              onChange(stringifyRGBA(color.rgb))
            }
            onChangeComplete={(color: ColorResult) => {
              onChangeComplete(stringifyRGBA(color.rgb));
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
      onChange={(event) => onChange(event.target.value)}
      value={value}
      id={id}
      prefix={prefix}
    />
  );
};
