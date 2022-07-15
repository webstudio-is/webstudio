import React from "react";
import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Link as LinkPrimitive } from "./link";
import argTypes from "./link.props.json";

export default {
  title: "Components/Link",
  component: LinkPrimitive,
  argTypes,
} as ComponentMeta<typeof LinkPrimitive>;

const Template: ComponentStory<typeof LinkPrimitive> = (args) => (
  <LinkPrimitive {...args} />
);

export const Link = Template.bind({});
Link.args = {
  children: "Link",
};
