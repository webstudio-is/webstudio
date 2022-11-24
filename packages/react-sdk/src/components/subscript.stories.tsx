import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Bold as BoldPrimitive } from "./bold";

export default {
  title: "Components/Bold",
  component: BoldPrimitive,
} as ComponentMeta<typeof BoldPrimitive>;

const Template: ComponentStory<typeof BoldPrimitive> = (args) => (
  <BoldPrimitive {...args} />
);

export const Bold = Template.bind({});
Bold.args = {
  children: "some bold text",
};
