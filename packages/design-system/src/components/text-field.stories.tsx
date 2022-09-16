import React from "react";
import { ComponentStory } from "@storybook/react";
import { TextField } from "./text-field";
import { Flex } from "./flex";

export default {
  component: TextField,
};

export const Default: ComponentStory<typeof TextField> = () => {
  return <TextField />;
};

export const Type: ComponentStory<typeof TextField> = () => {
  return <TextField type="number" />;
};

export const Sizes: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField size={1} />
      <TextField size={2} />
    </Flex>
  );
};

export const Variants: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField />
      <TextField variant="ghost" />
    </Flex>
  );
};

export const State: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField />
      <TextField state="invalid" />
      <TextField state="valid" />
    </Flex>
  );
};

export const Cursor: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField cursor="default" />
      <TextField cursor="text" />
    </Flex>
  );
};
