import type { Meta, StoryObj } from "@storybook/react";
import { Slot as SlotPrimitive } from "./slot";

export default {
  title: "Components/Slot",
  component: SlotPrimitive,
} satisfies Meta<typeof SlotPrimitive>;

export const Slot: StoryObj<typeof SlotPrimitive> = {
  args: {
    children: "Slot",
  },
};
