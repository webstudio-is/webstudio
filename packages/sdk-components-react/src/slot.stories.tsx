import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Slot as SlotPrimitive } from "./slot";

export default {
  title: "Components/Slot",
  component: SlotPrimitive,
} as ComponentMeta<typeof SlotPrimitive>;

const Template: ComponentStory<typeof SlotPrimitive> = (args) => (
  <SlotPrimitive {...args} />
);

export const Slot = Template.bind({});
Slot.args = {
  children: "Slot",
};
