import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Vimeo as VimeoPrimitive } from "./vimeo";

export default {
  title: "Components/Vimeo",
  component: VimeoPrimitive,
} as ComponentMeta<typeof VimeoPrimitive>;

const Template: ComponentStory<typeof VimeoPrimitive> = (args) => (
  <VimeoPrimitive
    {...args}
    style={{ minHeight: 20, outline: "1px solid black" }}
  />
);

export const Vimeo = Template.bind({});
Vimeo.args = {};
