import type { Meta, StoryObj } from "@storybook/react";
import { Span as SpanPrimitive } from "./span";

export default {
  title: "Components/Span",
  component: SpanPrimitive,
} satisfies Meta<typeof SpanPrimitive>;

export const Span: StoryObj<typeof SpanPrimitive> = {
  args: {
    children: "some span text",
  },
};
