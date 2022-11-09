import {
  type ComponentProps,
  type FocusEvent,
  forwardRef,
  type KeyboardEvent,
} from "react";
import { styled } from "../stitches.config";
import { Flex } from "./flex";
import { Text } from "./text";

const ListBase = styled("ul", {
  display: "flex",
  flexDirection: "column",
  margin: 0,
  padding: 0,
});

const ListItemBase = styled("li", {
  display: "grid",
  gridTemplateColumns: "$spacing$10 1fr",
  alignItems: "center",
  justifyContent: "space-between",
  height: "$spacing$11",
  px: "$spacing$3",
  listStyle: "none",
  borderRadius: "$1",
  outline: 0,
  variants: {
    state: {
      disabled: {
        pointerEvents: "none",
      },
      selected: {
        boxShadow:
          "0px 0px 0px 2px $colors$blue10, 0px 0px 0px 2px $colors$blue10",
      },
    },
  },
});

export const List = forwardRef<
  HTMLUListElement,
  ComponentProps<typeof ListBase>
>((props, ref) => {
  return <ListBase role="listbox" ref={ref} {...props} />;
});
List.displayName = "List";

export const ListItem = forwardRef<
  HTMLLIElement,
  Omit<ComponentProps<typeof ListItemBase>, "prefix" | "suffix" | "current"> & {
    state?: "disabled" | "selected";
    prefix?: JSX.Element;
    suffix?: JSX.Element;
    current?: boolean;
  }
>(({ children, prefix, suffix, state, current, ...props }, ref) => {
  return (
    <ListItemBase
      ref={ref}
      state={state}
      tabIndex={state === "disabled" ? -1 : 0}
      role="option"
      {...(state === "selected" ? { "aria-selected": true } : undefined)}
      {...(current ? { "aria-current": true } : undefined)}
      {...props}
    >
      {prefix}
      <Flex css={{ gridColumn: 2 }} align="center">
        <Text
          variant="label"
          truncate
          color={state === "disabled" ? "hint" : "contrast"}
        >
          {children}
        </Text>
        {suffix}
      </Flex>
    </ListItemBase>
  );
});
ListItem.displayName = "ListItem";

export const findNextListIndex = (
  currentIndex: number,
  total: number,
  direction: "next" | "previous"
) => {
  const nextIndex =
    direction === "next"
      ? currentIndex + 1
      : direction === "previous"
      ? currentIndex - 1
      : currentIndex;

  if (nextIndex < 0) {
    return total - 1;
  }
  if (nextIndex >= total) {
    return 0;
  }
  return nextIndex;
};

type UseList<Item = unknown> = {
  items: Array<Item>;
  selectedIndex: number;
  currentIndex: number;
  onSelect: (index: number) => void;
  onChangeCurrent: (index: number) => void;
};

export const useList = ({
  items,
  selectedIndex,
  currentIndex,
  onSelect,
  onChangeCurrent,
}: UseList) => {
  const getItemProps = ({ index }: { index: number }) => {
    return {
      state: selectedIndex === index ? ("selected" as const) : undefined,
      key: index,
      current: currentIndex === index,
      onFocus(event: FocusEvent) {
        const isItem = event.target === event.currentTarget;
        // We need to ignore focus on anything inside
        if (isItem) {
          onSelect(index);
        }
      },
      onMouseEnter() {
        onSelect(index);
      },
      onClick() {
        onChangeCurrent(index);
      },
    };
  };

  const getListProps = () => {
    return {
      onKeyDown(event: KeyboardEvent) {
        switch (event.code) {
          case "ArrowUp":
          case "ArrowDown": {
            const nextIndex = findNextListIndex(
              selectedIndex,
              items.length,
              event.code === "ArrowUp" ? "previous" : "next"
            );
            onSelect(nextIndex);
            break;
          }
          case "Enter":
          case "Space": {
            onChangeCurrent(selectedIndex);
          }
        }
      },
      onBlur(event: FocusEvent) {
        const isFocusWithin = event.currentTarget.contains(event.relatedTarget);
        if (isFocusWithin === false) {
          onSelect(-1);
        }
      },
    };
  };

  return { getItemProps, getListProps };
};
