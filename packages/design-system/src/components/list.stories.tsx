import type { ComponentStory } from "@storybook/react";
import { CheckIcon, DotsHorizontalIcon } from "@webstudio-is/icons";
import { List, ListItem } from "./list";

export default {
  component: List,
};

export const Simple: ComponentStory<typeof List> = () => {
  return (
    <List>
      <ListItem>Apple</ListItem>
      <ListItem state="disabled">Banana</ListItem>
      <ListItem state="selected">Orange</ListItem>
      <ListItem prefix={<CheckIcon />} suffix={<DotsHorizontalIcon />}>
        Orange
      </ListItem>
      <ListItem
        prefix={<CheckIcon />}
        suffix={<DotsHorizontalIcon />}
        current
        state="selected"
      >
        Orange
      </ListItem>
    </List>
  );
};
