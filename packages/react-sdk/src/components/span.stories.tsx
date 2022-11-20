import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Span as SpanPrimitive } from "./span";

export default {
  title: "Components/Span",
  component: SpanPrimitive,
} as ComponentMeta<typeof SpanPrimitive>;

const Template: ComponentStory<typeof SpanPrimitive> = (args) => (
  <SpanPrimitive {...args} />
);

export const Span = Template.bind({});
Span.args = {
  children: "some span text",
};
