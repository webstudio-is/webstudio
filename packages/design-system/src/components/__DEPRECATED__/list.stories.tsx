import type { StoryFn } from "@storybook/react";
import { CheckMarkIcon, EllipsesIcon } from "@webstudio-is/icons";
import { useState } from "react";
import { DeprecatedList, DeprecatedListItem, useDeprecatedList } from "./list";

export default {
  title: "Deprecated/List",
  component: DeprecatedList,
};

export const Declarative: StoryFn<typeof DeprecatedList> = () => {
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

export const WithHook: StoryFn<typeof DeprecatedList> = () => {
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

export const CurrentWithoutSelected: StoryFn<typeof DeprecatedList> = () => (
  <DeprecatedList>
    <DeprecatedListItem>Regular item</DeprecatedListItem>
    <DeprecatedListItem current>Current but not selected</DeprecatedListItem>
    <DeprecatedListItem prefix={<CheckMarkIcon />}>
      With prefix only
    </DeprecatedListItem>
  </DeprecatedList>
);

export const SuffixOnly: StoryFn<typeof DeprecatedList> = () => (
  <DeprecatedList>
    <DeprecatedListItem suffix={<EllipsesIcon />}>
      Item with suffix
    </DeprecatedListItem>
    <DeprecatedListItem suffix={<EllipsesIcon />} state="selected">
      Selected with suffix
    </DeprecatedListItem>
    <DeprecatedListItem suffix={<EllipsesIcon />} state="disabled">
      Disabled with suffix
    </DeprecatedListItem>
  </DeprecatedList>
);
