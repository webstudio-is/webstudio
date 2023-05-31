import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { RichTextLink as LinkPrimitive } from "./rich-text-link";

export default {
  title: "Components/RichTextLink",
  component: LinkPrimitive,
} as ComponentMeta<typeof LinkPrimitive>;

const Template: ComponentStory<typeof LinkPrimitive> = (args) => (
  <LinkPrimitive {...args} />
);

export const RichTextLink = Template.bind({});
RichTextLink.args = {
  children: "RichTextLink",
};
