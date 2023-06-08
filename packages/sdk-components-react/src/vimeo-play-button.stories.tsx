import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { VimeoPlayButton as VimeoPlayButtonPrimitive } from "./vimeo-play-button";

export default {
  title: "Components/Vimeo Preview Image",
  component: VimeoPlayButtonPrimitive,
} as ComponentMeta<typeof VimeoPlayButtonPrimitive>;

const Template: ComponentStory<typeof VimeoPlayButtonPrimitive> = (args) => (
  <VimeoPlayButtonPrimitive
    {...args}
    style={{ minHeight: 20, outline: "1px solid black" }}
  />
);

export const VimeoPlayButton = Template.bind({});
VimeoPlayButton.args = {};
