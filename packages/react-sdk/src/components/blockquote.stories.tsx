import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Blockquote as BlockquotePrimitive } from "./blockquote";

export default {
  title: "Components/Blockquote",
  component: BlockquotePrimitive,
} as ComponentMeta<typeof BlockquotePrimitive>;

const Template: ComponentStory<typeof BlockquotePrimitive> = (args) => (
  <BlockquotePrimitive {...args} />
);

export const Blockquote = Template.bind({});
Blockquote.args = {
  children: "Blockquote",
};
