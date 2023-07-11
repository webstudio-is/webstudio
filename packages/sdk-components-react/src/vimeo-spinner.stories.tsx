import type { Meta, StoryObj } from "@storybook/react";
import { VimeoSpinner as VimeoSpinnerPrimitive } from "./vimeo-spinner";

export default {
  title: "Components/Vimeo Spinner",
  component: VimeoSpinnerPrimitive,
} satisfies Meta<typeof VimeoSpinnerPrimitive>;

export const VimeoSpinner: StoryObj<typeof VimeoSpinnerPrimitive> = {
  args: {
    style: { minHeight: 20, outline: "1px solid black" },
  },
};
