import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { List as ListPrimitive } from "./list";
import { ListItem } from "./list-item";

export default {
  title: "Components/List",
  component: ListPrimitive,
} as ComponentMeta<typeof ListPrimitive>;

const Template: ComponentStory<typeof ListPrimitive> = (args) => (
  <ListPrimitive {...args} />
);

export const List = Template.bind({});
List.args = {
  children: <ListItem />,
};
