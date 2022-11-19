import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Body as BodyPrimitive } from "./body";
import argTypes from "./body.props.json";

export default {
  title: "Components/Body",
  component: BodyPrimitive,
  argTypes,
} as ComponentMeta<typeof BodyPrimitive>;

export const Body: ComponentStory<typeof BodyPrimitive> = (args) => (
  <BodyPrimitive {...args} />
);
