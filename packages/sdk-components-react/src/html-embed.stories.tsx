import type { Meta, StoryObj } from "@storybook/react";
import { HtmlEmbed as HtmlEmbedPrimitive } from "./html-embed";

export default {
  title: "Components/HtmlEmbed",
  component: HtmlEmbedPrimitive,
} satisfies Meta<typeof HtmlEmbedPrimitive>;

export const HtmlEmbed: StoryObj<typeof HtmlEmbedPrimitive> = {
  args: {
    code: "<strong>custom code</strong>",
  },
};
