import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { HtmlEmbed as HtmlEmbedPrimitive } from "./html-embed";

export default {
  title: "Components/HtmlEmbed",
  component: HtmlEmbedPrimitive,
} as ComponentMeta<typeof HtmlEmbedPrimitive>;

const Template: ComponentStory<typeof HtmlEmbedPrimitive> = (args) => (
  <HtmlEmbedPrimitive {...args} />
);

export const HtmlEmbed = Template.bind({});
HtmlEmbed.args = {
  code: "<strong>custom code</strong>",
};
