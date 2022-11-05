import type { ComponentStory } from "@storybook/react";
import { CheckIcon, MenuIcon } from "@webstudio-is/icons";
import { useState } from "react";
import { List, ListItem, useList } from "./list";

export default {
  component: List,
};

export const Declarative: ComponentStory<typeof List> = () => {
  return (
    <List>
      <ListItem>Apple</ListItem>
      <ListItem state="disabled">Banana</ListItem>
      <ListItem state="selected">Orange</ListItem>
      <ListItem prefix={<CheckIcon />} suffix={<MenuIcon />}>
        Strawberry
      </ListItem>
      <ListItem
        prefix={<CheckIcon />}
        suffix={<MenuIcon />}
        current
        state="selected"
      >
        Watermelon
      </ListItem>
    </List>
  );
};

export const WithHook: ComponentStory<typeof List> = () => {
  const items = ["Banana", "Orange", "Apple"];
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const { getListProps, getItemProps } = useList({
    items,
    selectedIndex,
    currentIndex,
    onSelect: setSelectedIndex,
    onChangeCurrent: setCurrentIndex,
  });
  return (
    <List {...getListProps()}>
      {items.map((item, index) => {
        const itemProps = getItemProps({ index });
        return (
          <ListItem
            {...itemProps}
            key={index}
            prefix={itemProps.current ? <CheckIcon /> : undefined}
          >
            {item}
          </ListItem>
        );
      })}
    </List>
  );
};
