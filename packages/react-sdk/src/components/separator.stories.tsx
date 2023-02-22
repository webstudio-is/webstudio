import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Separator as SeparatorPrimitive } from "./separator";

export default {
  title: "Components/Separator",
  component: SeparatorPrimitive,
} as ComponentMeta<typeof SeparatorPrimitive>;

const Template: ComponentStory<typeof SeparatorPrimitive> = (args) => (
  <SeparatorPrimitive {...args} />
);

export const Separator = Template.bind({});
Separator.args = {};
