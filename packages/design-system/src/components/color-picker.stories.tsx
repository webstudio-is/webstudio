import { useState } from "react";
import type { RgbValue, StyleValue } from "@webstudio-is/css-engine";
import {
  ColorPicker as ColorPickerComponent,
  ColorThumb,
} from "./color-picker";
import { Flex } from "./flex";
import { Text } from "./text";
import { StorySection } from "./storybook";

export default {
  title: "Color Picker",
};

const initialColor: RgbValue = {
  type: "rgb",
  r: 90,
  g: 155,
  b: 255,
  alpha: 1,
};

export const ColorPicker = () => {
  const [value, setValue] = useState<StyleValue>(initialColor);
  const [open, setOpen] = useState(true);

  return (
    <>
      <StorySection title="Color Picker">
        <Flex direction="column" gap="2">
          <ColorPickerComponent
            value={value}
            open={open}
            onOpenChange={setOpen}
            onChange={(val) => {
              if (val !== undefined) {
                setValue(val);
              }
            }}
            onChangeComplete={setValue}
          />
          <Text>{JSON.stringify(value)}</Text>
        </Flex>
      </StorySection>

      <StorySection title="Thumb">
        <Flex gap="3" align="center">
          <ColorThumb color="rgb(255, 0, 0)" />
          <ColorThumb color="rgba(0, 128, 255, 0.5)" />
          <ColorThumb color="transparent" />
          <ColorThumb color="#00FF00" interactive />
        </Flex>
      </StorySection>
    </>
  );
};
