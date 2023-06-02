import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { TextLink as TextLinkPrimitive } from "./text-link";

export default {
  title: "Components/TextLink",
  component: TextLinkPrimitive,
} as ComponentMeta<typeof TextLinkPrimitive>;

const Template: ComponentStory<typeof TextLinkPrimitive> = (args) => (
  <TextLinkPrimitive {...args} />
);

export const TextLink = Template.bind({});
TextLink.args = {
  children: "TextLink",
};
