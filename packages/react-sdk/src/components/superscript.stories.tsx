import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Superscript as SuperscriptPrimitive } from "./superscript";

export default {
  title: "Components/Superscript",
  component: SuperscriptPrimitive,
} as ComponentMeta<typeof SuperscriptPrimitive>;

const Template: ComponentStory<typeof SuperscriptPrimitive> = (args) => (
  <SuperscriptPrimitive {...args} />
);

export const Superscript = Template.bind({});
Superscript.args = {
  children: "some superscript text",
};
