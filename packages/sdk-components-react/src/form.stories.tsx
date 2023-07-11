import type { Meta, StoryObj } from "@storybook/react";
import { Form as FormPrimitive } from "./form";

export default {
  title: "Components/Form",
  component: FormPrimitive,
} satisfies Meta<typeof FormPrimitive>;

export const Form: StoryObj<typeof FormPrimitive> = {
  args: {
    children: "Form",
  },
};
