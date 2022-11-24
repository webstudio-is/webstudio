import type { ComponentMeta, ComponentStory } from "@storybook/react";
import { Image as ImagePrimitive } from "./image";

export default {
  title: "Components/Image",
  component: ImagePrimitive,
} as ComponentMeta<typeof ImagePrimitive>;

const Template: ComponentStory<typeof ImagePrimitive> = (args) => (
  <ImagePrimitive {...args} />
);

export const Image = Template.bind({});

Image.args = {};
