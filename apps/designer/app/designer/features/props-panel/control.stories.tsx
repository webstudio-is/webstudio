import { ComponentStoryObj } from "@storybook/react";
import { Control } from "./control";

export default {
  component: Control,
};

export const Primitive: ComponentStoryObj<typeof Control> = {
  args: {
    component: "Image",
    userProp: {
      prop: "src",
      id: "ddf20afe-65a8-478e-a52d-1be2d2f70830",
      value: "",
    },
  },
};

export const Options: ComponentStoryObj<typeof Control> = {
  args: {
    component: "Image",
    userProp: {
      prop: "loading",
      id: "ddf20afe-65a8-478e-a52d-1be2d2f70830",
      value: "",
    },
  },
};
