import type { Meta, StoryObj } from "@storybook/react";
import { List as ListPrimitive } from "./list";
import { ListItem } from "./list-item";

export default {
  title: "Components/List",
  component: ListPrimitive,
} satisfies Meta<typeof ListPrimitive>;

export const List: StoryObj<typeof ListPrimitive> = {
  args: {
    children: <ListItem>List</ListItem>,
  },
};
