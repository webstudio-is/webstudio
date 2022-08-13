import { useState } from "react";
import { ColorResult, RGBColor, SketchPicker } from "react-color";
import {
  Box,
  Grid,
  Flex,
  Popover,
  PopoverTrigger,
  PopoverContent,
  TextField,
} from "@webstudio-is/design-system";
import { PropertyNameUtility } from "./property-name-utility";
import { getFinalValue } from "../shared/get-final-value";
import type { ControlProps } from "../style-sections";

const stringifyRGBA = (color: RGBColor) => {
  const { r, g, b, a = 1 } = color;

  return `rgba(${r},${g},${b},${a})`;
};

type ColorPickerProps = {
  onChange: (value: string) => void;
  onChangeComplete: (value: string) => void;
  value: string;
  id: string;
};

const ColorPicker = ({
  value,
  onChange,
  onChangeComplete,
  id,
}: ColorPickerProps) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  // Color picker will use 0 as alpha value, which will force user to set alpha every time they have to change from transparent
  if (value === "transparent") value = "";

  return (
    <Popover
      modal
      open={displayColorPicker}
      onOpenChange={setDisplayColorPicker}
    >
      <PopoverTrigger asChild aria-label="Open color picker">
        <Flex>
          <Box
            css={{
              width: "$5",
              height: "$5",
              background: value,
            }}
          />
          <TextField
            onChange={(e) => onChange(e.target.value)}
            onClick={() => setDisplayColorPicker((shown) => !shown)}
            variant="ghost"
            value={value}
            id={id}
          />
        </Flex>
      </PopoverTrigger>

      <PopoverContent>
        <SketchPicker
          color={value}
          onChange={(color: ColorResult) => onChange(stringifyRGBA(color.rgb))}
          onChangeComplete={(color: ColorResult) => {
            onChangeComplete(stringifyRGBA(color.rgb));
          }}
          // @todo to remove both when we have preset colors
          presetColors={[]}
          styles={{
            default: {
              picker: {
                padding: 10,
              },
            },
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

export const ColorControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });
  if (value === undefined) return null;
  const setValue = setProperty(styleConfig.property);

  return (
    <Grid columns={2} align="center" gapX="1">
      <PropertyNameUtility
        property={styleConfig.property}
        label={styleConfig.label}
      />
      <Flex align="center" css={{ gridColumn: "2/4" }} gap="1">
        <ColorPicker
          id={styleConfig.property}
          value={String(value.value)}
          onChange={(value) => {
            setValue(value, { isEphemeral: true });
          }}
          onChangeComplete={setValue}
        />
      </Flex>
    </Grid>
  );
};
