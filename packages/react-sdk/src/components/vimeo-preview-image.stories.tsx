import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { VimeoPreviewImage as VimeoPreviewImagePrimitive } from "./vimeo-preview-image";

export default {
  title: "Components/Vimeo Preview Image",
  component: VimeoPreviewImagePrimitive,
} as ComponentMeta<typeof VimeoPreviewImagePrimitive>;

const Template: ComponentStory<typeof VimeoPreviewImagePrimitive> = (args) => (
  <VimeoPreviewImagePrimitive
    {...args}
    style={{ minHeight: 20, outline: "1px solid black" }}
  />
);

export const VimeoPreviewImage = Template.bind({});
VimeoPreviewImage.args = {};
