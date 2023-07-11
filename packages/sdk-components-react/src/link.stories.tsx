import type { Meta, StoryObj } from "@storybook/react";
import { Link as LinkPrimitive } from "./link";

export default {
  title: "Components/Link",
  component: LinkPrimitive,
} satisfies Meta<typeof LinkPrimitive>;

export const Link: StoryObj<typeof LinkPrimitive> = {
  args: {
    children: "Link",
  },
};
