import type { Meta, StoryObj } from "@storybook/react";
import { CodeText as CodeTextPrimitive } from "./code-text";

export default {
  title: "Components/CodeText",
  component: CodeTextPrimitive,
} satisfies Meta<typeof CodeTextPrimitive>;

export const CodeText: StoryObj<typeof CodeTextPrimitive> = {
  args: {
    children: "alert('Hello World!')",
  },
};
