import type { Meta, StoryObj } from "@storybook/react";
import { Input as InputPrimitive } from "./input";

export default {
  title: "Components/Input",
  component: InputPrimitive,
} satisfies Meta<typeof InputPrimitive>;

export const Input: StoryObj<typeof InputPrimitive> = {
  args: {},
};
