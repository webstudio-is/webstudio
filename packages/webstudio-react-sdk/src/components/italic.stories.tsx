import React from "react";
import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Italic as ItalicPrimitive } from "./italic";
import argTypes from "./italic.props.json";

export default {
  title: "Components/Italic",
  component: ItalicPrimitive,
  argTypes,
} as ComponentMeta<typeof ItalicPrimitive>;

const Template: ComponentStory<typeof ItalicPrimitive> = (args) => (
  <ItalicPrimitive {...args} />
);

export const Italic = Template.bind({});
Italic.args = {
  children: "some italic text",
};
