import type { ComponentMeta, ComponentStory } from "@storybook/react";
import { Image as ImagePrimitive } from "./image";
import argTypes from "./image.props.json";

export default {
  title: "Components/Image",
  component: ImagePrimitive,
  argTypes,
} as ComponentMeta<typeof ImagePrimitive>;

const Template: ComponentStory<typeof ImagePrimitive> = (args) => (
  <ImagePrimitive {...args} />
);

export const Image = Template.bind({});

Image.args = {};
