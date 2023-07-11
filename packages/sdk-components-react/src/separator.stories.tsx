import type { Meta, StoryObj } from "@storybook/react";
import { Separator as SeparatorPrimitive } from "./separator";

export default {
  title: "Components/Separator",
  component: SeparatorPrimitive,
} satisfies Meta<typeof SeparatorPrimitive>;

export const Separator: StoryObj<typeof SeparatorPrimitive> = {};
