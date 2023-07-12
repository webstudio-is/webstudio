import type { Meta, StoryObj } from "@storybook/react";
import { Subscript as SubscriptPrimitive } from "./subscript";

export default {
  title: "Components/Subscript",
  component: SubscriptPrimitive,
} satisfies Meta<typeof SubscriptPrimitive>;

export const Subscript: StoryObj<typeof SubscriptPrimitive> = {
  args: {
    children: "some subscript text",
  },
};
