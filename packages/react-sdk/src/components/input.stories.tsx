import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Input as InputPrimitive } from "./input";

export default {
  title: "Components/Input",
  component: InputPrimitive,
} as ComponentMeta<typeof InputPrimitive>;

const Template: ComponentStory<typeof InputPrimitive> = (args) => (
  <InputPrimitive {...args} />
);

export const Input = Template.bind({});
Input.args = {};
