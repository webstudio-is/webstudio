import { useState } from "react";
import type { RgbValue, StyleValue } from "@webstudio-is/css-engine";
import {
  ColorPicker as ColorPickerComponent,
  ColorPickerPopover,
} from "./color-picker";
import { Flex } from "./flex";
import { Text } from "./text";

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
