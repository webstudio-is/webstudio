import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { SpanContainer as SpanContainerPrimitive } from "./span-container";

export default {
  title: "Components/SpanContainer",
  component: SpanContainerPrimitive,
} as ComponentMeta<typeof SpanContainerPrimitive>;

const Template: ComponentStory<typeof SpanContainerPrimitive> = (args) => (
  <SpanContainerPrimitive {...args} />
);

export const SpanContainer = Template.bind({});
SpanContainer.args = {
  children: "some span text",
};
