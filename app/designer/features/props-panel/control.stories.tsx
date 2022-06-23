import { ComponentStoryObj } from "@storybook/react";
import { Control } from "./control";

export default {
  component: Control,
};

export const Primitive: ComponentStoryObj<typeof Control> = {
  args: {
    type: "text",
  },
};

export const Options: ComponentStoryObj<typeof Control> = {
  args: {
    type: "radio",
    options: ["option1", "option2"],
  },
};
