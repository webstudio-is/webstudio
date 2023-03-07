import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Link as LinkPrimitive } from "./link";

export default {
  title: "Components/Link Block",
  component: LinkPrimitive,
} as ComponentMeta<typeof LinkPrimitive>;

const Template: ComponentStory<typeof LinkPrimitive> = (args) => (
  <LinkPrimitive {...args} />
);

export const Link = Template.bind({});
