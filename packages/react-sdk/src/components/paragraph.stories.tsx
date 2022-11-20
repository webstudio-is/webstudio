import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Paragraph as ParagraphPrimitive } from "./paragraph";

export default {
  title: "Components/Paragraph",
  component: ParagraphPrimitive,
} as ComponentMeta<typeof ParagraphPrimitive>;

const Template: ComponentStory<typeof ParagraphPrimitive> = (args) => (
  <ParagraphPrimitive {...args} />
);

export const Paragraph = Template.bind({});
Paragraph.args = {
  children: "paragraph",
};
