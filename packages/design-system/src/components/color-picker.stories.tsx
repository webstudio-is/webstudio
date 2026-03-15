import { useState } from "react";
import type { RgbValue, StyleValue } from "@webstudio-is/css-engine";
import {
  ColorPicker as ColorPickerComponent,
  ColorPickerPopover,
  ColorThumb,
} from "./color-picker";
import { Flex } from "./flex";
import { Grid } from "./grid";
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
  const [inlineValue, setInlineValue] = useState<StyleValue>(initialColor);
  const [popoverValue, setPopoverValue] = useState<StyleValue>(initialColor);

  return (
    <>
      <StorySection title="Inline">
        <Flex direction="column" gap="2">
          <ColorPickerComponent
            value={inlineValue}
            onChange={(value) => {
              if (value !== undefined) {
                setInlineValue(value);
              }
            }}
            onChangeComplete={setInlineValue}
          />
          <Text>{JSON.stringify(inlineValue)}</Text>
        </Flex>
      </StorySection>

      <StorySection title="Popover">
        <Flex direction="column" gap="2">
          <ColorPickerPopover
            value={popoverValue}
            onChange={(value) => {
              if (value !== undefined) {
                setPopoverValue(value);
              }
            }}
            onChangeComplete={setPopoverValue}
          />
          <Text>{JSON.stringify(popoverValue)}</Text>
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

export const PopoverPositioning = () => {
  const [value, setValue] = useState<StyleValue>(initialColor);
  const handleChange = (val: StyleValue | undefined) => {
    if (val !== undefined) {
      setValue(val);
    }
  };
  return (
    <Grid
      columns={2}
      gap="9"
      align="center"
      justify="center"
      style={{ padding: 100, minHeight: "100vh" }}
    >
      <Flex direction="column" gap="2" align="center">
        <Text variant="labels">Side top</Text>
        <ColorPickerPopover
          value={value}
          onChange={handleChange}
          onChangeComplete={setValue}
          side="top"
          open={true}
        />
      </Flex>
      <Flex direction="column" gap="2" align="center">
        <Text variant="labels">Side right</Text>
        <ColorPickerPopover
          value={value}
          onChange={handleChange}
          onChangeComplete={setValue}
          side="right"
          open={true}
        />
      </Flex>
      <Flex direction="column" gap="2" align="center">
        <Text variant="labels">Align start</Text>
        <ColorPickerPopover
          value={value}
          onChange={handleChange}
          onChangeComplete={setValue}
          side="bottom"
          align="start"
          open={true}
        />
      </Flex>
      <Flex direction="column" gap="2" align="center">
        <Text variant="labels">Side offset 16</Text>
        <ColorPickerPopover
          value={value}
          onChange={handleChange}
          onChangeComplete={setValue}
          sideOffset={16}
          open={true}
        />
      </Flex>
    </Grid>
  );
};
