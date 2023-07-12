import type { Meta, StoryObj } from "@storybook/react";
import { Text as TextPrimitive } from "./text";

export default {
  title: "Components/Text",
  component: TextPrimitive,
} satisfies Meta<typeof TextPrimitive>;

export const Text: StoryObj<typeof TextPrimitive> = {
  args: {
    children: "text",
  },
};
