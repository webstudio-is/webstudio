import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Body as BodyPrimitive } from "./body";

export default {
  title: "Components/Body",
  component: BodyPrimitive,
} as ComponentMeta<typeof BodyPrimitive>;

export const Body: ComponentStory<typeof BodyPrimitive> = (args) => (
  <BodyPrimitive {...args} />
);
