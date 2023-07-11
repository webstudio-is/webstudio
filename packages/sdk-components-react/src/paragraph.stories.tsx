import type { Meta, StoryObj } from "@storybook/react";
import { Paragraph as ParagraphPrimitive } from "./paragraph";

export default {
  title: "Components/Paragraph",
  component: ParagraphPrimitive,
} satisfies Meta<typeof ParagraphPrimitive>;

export const Paragraph: StoryObj<typeof ParagraphPrimitive> = {
  args: {
    children: "paragraph",
  },
};
