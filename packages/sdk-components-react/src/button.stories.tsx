import type { Meta, StoryObj } from "@storybook/react";
import { Button as ButtonPrimitive } from "./button";

export default {
  title: "Components/Button",
  component: ButtonPrimitive,
} satisfies Meta<typeof ButtonPrimitive>;

export const Button: StoryObj<typeof ButtonPrimitive> = {
  args: {
    children: "Click me",
  },
};
