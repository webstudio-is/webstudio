import { ComponentStoryObj } from "@storybook/react";
import { Control } from "./control";

export default {
  component: Control,
};

export const Primitive: ComponentStoryObj<typeof Control> = {
  args: {
    component: "Image",
    prop: "src",
  },
};

export const Options: ComponentStoryObj<typeof Control> = {
  args: {
    component: "Image",
    prop: "loading",
  },
};
