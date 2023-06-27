import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Subscript as SubscriptPrimitive } from "./subscript";

export default {
  title: "Components/Subscript",
  component: SubscriptPrimitive,
} as ComponentMeta<typeof SubscriptPrimitive>;

const Template: ComponentStory<typeof SubscriptPrimitive> = (args) => (
  <SubscriptPrimitive {...args} />
);

export const Subscript = Template.bind({});
Subscript.args = {
  children: "some subscript text",
};
