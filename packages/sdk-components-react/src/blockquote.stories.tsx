import type { Meta, StoryObj } from "@storybook/react";
import { Blockquote as BlockquotePrimitive } from "./blockquote";

export default {
  title: "Components/Blockquote",
  component: BlockquotePrimitive,
} satisfies Meta<typeof BlockquotePrimitive>;

export const Blockquote: StoryObj<typeof BlockquotePrimitive> = {
  args: {
    children: "Blockquote",
  },
};
