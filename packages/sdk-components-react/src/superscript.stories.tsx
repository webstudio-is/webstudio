import type { Meta, StoryObj } from "@storybook/react";
import { Superscript as SuperscriptPrimitive } from "./superscript";

export default {
  title: "Components/Superscript",
  component: SuperscriptPrimitive,
} satisfies Meta<typeof SuperscriptPrimitive>;

export const Superscript: StoryObj<typeof SuperscriptPrimitive> = {
  args: {
    children: "some superscript text",
  },
};
