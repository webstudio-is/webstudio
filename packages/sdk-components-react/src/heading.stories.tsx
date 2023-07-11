import type { Meta, StoryObj } from "@storybook/react";
import { Heading as HeadingPrimitive } from "./heading";

export default {
  title: "Components/Heading",
  component: HeadingPrimitive,
} satisfies Meta<typeof HeadingPrimitive>;

export const Heading: StoryObj<typeof HeadingPrimitive> = {
  args: {
    children: "Heading",
  },
};
