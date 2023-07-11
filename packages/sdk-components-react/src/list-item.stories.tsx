import type { Meta, StoryObj } from "@storybook/react";
import { ListItem as ListItemPrimitive } from "./list-item";

export default {
  title: "Components/List Item",
  component: ListItemPrimitive,
} satisfies Meta<typeof ListItemPrimitive>;

export const ListItem: StoryObj<typeof ListItemPrimitive> = {
  args: {
    children: "ListItem",
  },
};
