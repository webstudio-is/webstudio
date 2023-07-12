import type { Meta, StoryObj } from "@storybook/react";
import { Body as BodyPrimitive } from "./body";

export default {
  title: "Components/Body",
  component: BodyPrimitive,
} satisfies Meta<typeof BodyPrimitive>;

export const Body: StoryObj<typeof BodyPrimitive> = {
  args: {
    children: "Body",
  },
};
