import type { StoryFn } from "@storybook/react";
import { useState } from "react";
import type { RgbValue, StyleValue } from "@webstudio-is/css-engine";
import { ColorPicker, ColorPickerPopover } from "./color-picker";
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

const formatValue = (value: StyleValue) => JSON.stringify(value);

const createHandlers = (setValue: (value: StyleValue) => void) => {
  const handleChange = (value?: StyleValue) => {
    if (value !== undefined) {
      setValue(value);
    }
  };

  const handleChangeComplete = (value: StyleValue) => {
    setValue(value);
  };

  return { handleChange, handleChangeComplete };
};

export const Inline: StoryFn<typeof ColorPicker> = () => {
  const [value, setValue] = useState<StyleValue>(initialColor);
  const { handleChange, handleChangeComplete } = createHandlers(setValue);

  return (
    <Flex direction="column" gap="4">
      <ColorPicker
        value={value}
        onChange={handleChange}
        onChangeComplete={handleChangeComplete}
      />
      <Text>{formatValue(value)}</Text>
    </Flex>
  );
};

export const WithPopover: StoryFn<typeof ColorPickerPopover> = () => {
  const [value, setValue] = useState<StyleValue>(initialColor);
  const { handleChange, handleChangeComplete } = createHandlers(setValue);

  return (
    <Flex direction="column" gap="4">
      <ColorPickerPopover
        value={value}
        onChange={handleChange}
        onChangeComplete={handleChangeComplete}
      />
      <Text>{formatValue(value)}</Text>
    </Flex>
  );
};
