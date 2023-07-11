import type { Meta, StoryObj } from "@storybook/react";
import { Vimeo as VimeoPrimitive } from "./vimeo";

export default {
  title: "Components/Vimeo",
  component: VimeoPrimitive,
} satisfies Meta<typeof VimeoPrimitive>;

export const Vimeo: StoryObj<typeof VimeoPrimitive> = {
  args: {
    style: { minHeight: 20, outline: "1px solid black" },
  },
};
