import type { Meta, StoryObj } from "@storybook/react";
import { Italic as ItalicPrimitive } from "./italic";

export default {
  title: "Components/Italic",
  component: ItalicPrimitive,
} satisfies Meta<typeof ItalicPrimitive>;

export const Italic: StoryObj<typeof ItalicPrimitive> = {
  args: {
    children: "some italic text",
  },
};
