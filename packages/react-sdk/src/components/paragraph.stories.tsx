import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Paragraph as ParagraphPrimitive } from "./paragraph";
import argTypes from "./paragraph.props.json";

export default {
  title: "Components/Paragraph",
  component: ParagraphPrimitive,
  argTypes,
} as ComponentMeta<typeof ParagraphPrimitive>;

const Template: ComponentStory<typeof ParagraphPrimitive> = (args) => (
  <ParagraphPrimitive {...args} />
);

export const Paragraph = Template.bind({});
Paragraph.args = {
  children: "paragraph",
};
