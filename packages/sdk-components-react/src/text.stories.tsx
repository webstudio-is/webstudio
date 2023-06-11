import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Text as TextPrimitive } from "./text";

export default {
  title: "Components/Text",
  component: TextPrimitive,
} as ComponentMeta<typeof TextPrimitive>;

const Template: ComponentStory<typeof TextPrimitive> = (args) => (
  <TextPrimitive {...args} />
);

export const Text = Template.bind({});
Text.args = {
  children: "text",
};
