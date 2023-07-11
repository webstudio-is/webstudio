import type { Meta, StoryObj } from "@storybook/react";
import { VimeoPreviewImage as VimeoPreviewImagePrimitive } from "./vimeo-preview-image";

export default {
  title: "Components/Vimeo Preview Image",
  component: VimeoPreviewImagePrimitive,
} satisfies Meta<typeof VimeoPreviewImagePrimitive>;

export const VimeoPreviewImage: StoryObj<typeof VimeoPreviewImagePrimitive> = {
  args: {
    style: { minHeight: 20, outline: "1px solid black" },
  },
};
