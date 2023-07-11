import type { Meta, StoryObj } from "@storybook/react";
import { Box as BoxPrimitive } from "./box";

export default {
  title: "Components/Box",
  component: BoxPrimitive,
} satisfies Meta<typeof BoxPrimitive>;

export const Box: StoryObj<typeof BoxPrimitive> = {
  args: {
    children: "Box",
  },
};
