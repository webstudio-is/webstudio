import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { VimeoSpinner as VimeoSpinnerPrimitive } from "./vimeo-spinner";

export default {
  title: "Components/Vimeo Preview Image",
  component: VimeoSpinnerPrimitive,
} as ComponentMeta<typeof VimeoSpinnerPrimitive>;

const Template: ComponentStory<typeof VimeoSpinnerPrimitive> = (args) => (
  <VimeoSpinnerPrimitive
    {...args}
    style={{ minHeight: 20, outline: "1px solid black" }}
  />
);

export const VimeoSpinner = Template.bind({});
VimeoSpinner.args = {};
