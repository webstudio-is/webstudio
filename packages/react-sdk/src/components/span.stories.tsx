import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Span as SpanPrimitive } from "./span";
import argTypes from "./span.props.json";

export default {
  title: "Components/Span",
  component: SpanPrimitive,
  argTypes,
} as ComponentMeta<typeof SpanPrimitive>;

const Template: ComponentStory<typeof SpanPrimitive> = (args) => (
  <SpanPrimitive {...args} />
);

export const Span = Template.bind({});
Span.args = {
  children: "some span text",
};
