import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { ListItem as ListItemPrimitive } from "./list-item";

export default {
  title: "Components/List Item",
  component: ListItemPrimitive,
} as ComponentMeta<typeof ListItemPrimitive>;

const Template: ComponentStory<typeof ListItemPrimitive> = (args) => (
  <ListItemPrimitive {...args} />
);

export const ListItem = Template.bind({});
ListItem.args = {
  children: "ListItem",
};
