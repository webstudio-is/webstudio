import type { Meta, StoryObj } from "@storybook/react";
import { VimeoPlayButton as VimeoPlayButtonPrimitive } from "./vimeo-play-button";

export default {
  title: "Components/Vimeo Play Button",
  component: VimeoPlayButtonPrimitive,
} satisfies Meta<typeof VimeoPlayButtonPrimitive>;

export const VimeoPlayButton: StoryObj<typeof VimeoPlayButtonPrimitive> = {
  args: {
    style: { minHeight: 20, outline: "1px solid black" },
  },
};
