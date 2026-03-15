import { useState } from "react";
import type { RgbValue, StyleValue } from "@webstudio-is/css-engine";
import {
  ColorPicker as ColorPickerComponent,
  ColorPickerPopover,
  ColorThumb,
} from "./color-picker";
import { Flex } from "./flex";
import { Text } from "./text";

export default {
  title: "Color picker",
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
    <Flex gap="9" align="start">
      <Flex direction="column" gap="2">
        <Text variant="labels">Inline</Text>
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
      <Flex direction="column" gap="2">
        <Text variant="labels">Popover</Text>
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
    </Flex>
  );
};

export const Thumb = () => (
  <Flex gap="3" align="center">
    <ColorThumb color="rgb(255, 0, 0)" />
    <ColorThumb color="rgba(0, 128, 255, 0.5)" />
    <ColorThumb color="transparent" />
    <ColorThumb color="#00FF00" interactive />
  </Flex>
);

export const PopoverPositioning = () => {
  const [value, setValue] = useState<StyleValue>(initialColor);
  const handleChange = (val: StyleValue | undefined) => {
    if (val !== undefined) {
      setValue(val);
    }
  };
  return (
    <Flex gap="9" align="center" wrap="wrap" style={{ padding: 100 }}>
      <Flex direction="column" gap="2" align="center">
        <Text variant="labels">Side top</Text>
        <ColorPickerPopover
          value={value}
          onChange={handleChange}
          onChangeComplete={setValue}
          side="top"
        />
      </Flex>
      <Flex direction="column" gap="2" align="center">
        <Text variant="labels">Side right</Text>
        <ColorPickerPopover
          value={value}
          onChange={handleChange}
          onChangeComplete={setValue}
          side="right"
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
        />
      </Flex>
      <Flex direction="column" gap="2" align="center">
        <Text variant="labels">Side offset 16</Text>
        <ColorPickerPopover
          value={value}
          onChange={handleChange}
          onChangeComplete={setValue}
          sideOffset={16}
        />
      </Flex>
    </Flex>
  );
};
