import type { Meta, StoryObj } from "@storybook/react";
import { Bold as BoldPrimitive } from "./bold";

export default {
  title: "Components/Bold",
  component: BoldPrimitive,
} satisfies Meta<typeof BoldPrimitive>;

export const Bold: StoryObj<typeof BoldPrimitive> = {
  args: {
    children: "some bold text",
  },
};
