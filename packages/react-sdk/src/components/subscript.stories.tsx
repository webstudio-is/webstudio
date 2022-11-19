import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Bold as BoldPrimitive } from "./bold";
import argTypes from "./bold.props.json";

export default {
  title: "Components/Bold",
  component: BoldPrimitive,
  argTypes,
} as ComponentMeta<typeof BoldPrimitive>;

const Template: ComponentStory<typeof BoldPrimitive> = (args) => (
  <BoldPrimitive {...args} />
);

export const Bold = Template.bind({});
Bold.args = {
  children: "some bold text",
};
