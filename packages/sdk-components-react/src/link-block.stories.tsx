import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { LinkBlock as LinkBlockPrimitive } from "./link-block";

export default {
  title: "Components/Link Block",
  component: LinkBlockPrimitive,
} as ComponentMeta<typeof LinkBlockPrimitive>;

const Template: ComponentStory<typeof LinkBlockPrimitive> = (args) => (
  <LinkBlockPrimitive {...args} />
);

export const LinkBlock = Template.bind({});
LinkBlock.args = {
  children: "Link Block",
};
