import type { Meta, StoryObj } from "@storybook/react";
import { Image as ImagePrimitive } from "./image";

export default {
  title: "Components/Image",
  component: ImagePrimitive,
} satisfies Meta<typeof ImagePrimitive>;

export const Image: StoryObj<typeof ImagePrimitive> = {};
