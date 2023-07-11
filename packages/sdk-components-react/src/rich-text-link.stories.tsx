import type { Meta, StoryObj } from "@storybook/react";
import { RichTextLink as LinkPrimitive } from "./rich-text-link";

export default {
  title: "Components/RichTextLink",
  component: LinkPrimitive,
} satisfies Meta<typeof LinkPrimitive>;

export const RichTextLink: StoryObj<typeof LinkPrimitive> = {
  args: {
    children: "RichTextLink",
  },
};
