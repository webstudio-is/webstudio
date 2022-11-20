import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { TextBlock as TextBlockPrimitive } from "./text-block";

export default {
  title: "Components/TextBlock",
  component: TextBlockPrimitive,
} as ComponentMeta<typeof TextBlockPrimitive>;

const Template: ComponentStory<typeof TextBlockPrimitive> = (args) => (
  <TextBlockPrimitive {...args} />
);

export const TextBlock = Template.bind({});
TextBlock.args = {
  children: "text",
};
