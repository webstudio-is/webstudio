import type { ComponentStory } from "@storybook/react";
import { CheckMarkIcon, EllipsesIcon } from "@webstudio-is/icons";
import { useState } from "react";
import { DeprecatedList, DeprecatedListItem, useDeprecatedList } from "./list";

export default {
  component: DeprecatedList,
};

export const Declarative: ComponentStory<typeof DeprecatedList> = () => {
  return (
    <DeprecatedList>
      <DeprecatedListItem>Apple</DeprecatedListItem>
      <DeprecatedListItem state="disabled">Banana</DeprecatedListItem>
      <DeprecatedListItem state="selected">Orange</DeprecatedListItem>
      <DeprecatedListItem prefix={<CheckMarkIcon />} suffix={<EllipsesIcon />}>
        Strawberry
      </DeprecatedListItem>
      <DeprecatedListItem
        prefix={<CheckMarkIcon />}
        suffix={<EllipsesIcon />}
        current
        state="selected"
      >
        Watermelon
      </DeprecatedListItem>
    </DeprecatedList>
  );
};

export const WithHook: ComponentStory<typeof DeprecatedList> = () => {
  const items = ["Banana", "Orange", "Apple"];
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const { getListProps, getItemProps } = useDeprecatedList({
    items,
    selectedIndex,
    currentIndex,
    onSelect: setSelectedIndex,
    onChangeCurrent: setCurrentIndex,
  });
  return (
    <DeprecatedList {...getListProps()}>
      {items.map((item, index) => {
        const itemProps = getItemProps({ index });
        return (
          <DeprecatedListItem
            {...itemProps}
            key={index}
            prefix={itemProps.current ? <CheckMarkIcon /> : undefined}
          >
            {item}
          </DeprecatedListItem>
        );
      })}
    </DeprecatedList>
  );
};
