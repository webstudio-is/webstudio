import type { ComponentMeta, ComponentStory } from "@storybook/react";
import { Button as ButtonPrimitive } from "./button";

export default {
  title: "Components/Button",
  component: ButtonPrimitive,
} as ComponentMeta<typeof ButtonPrimitive>;

const Template: ComponentStory<typeof ButtonPrimitive> = (args) => (
  <ButtonPrimitive {...args} />
);

export const Button = Template.bind({});

Button.args = {
  children: "Test",
};
