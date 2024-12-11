import {
  type ComponentProps,
  type FocusEvent,
  forwardRef,
  type JSX,
  type KeyboardEvent,
} from "react";
import { Text } from "../text";
import { Flex } from "../flex";
import { styled, theme } from "../../stitches.config";
import { findNextListItemIndex } from "../primitives/list";

const ListBase = styled("ul", {
  display: "flex",
  flexDirection: "column",
  margin: 0,
  padding: 0,
});

const ListItemBase = styled("li", {
  display: "grid",
  gridTemplateColumns: `${theme.spacing[10]} 1fr`,
  alignItems: "center",
  justifyContent: "space-between",
  height: theme.spacing[11],
  paddingLeft: theme.spacing[5],
  paddingRight: theme.spacing[8],
  listStyle: "none",
  outline: 0,
  position: "relative",
  "&[aria-selected]::before": {
    content: "''",
    position: "absolute",
    pointerEvents: "none",
    inset: `0 ${theme.spacing[3]}`,
    borderRadius: theme.borderRadius[4],
    border: `1px solid ${theme.colors.borderFocus}`,
  },
});

export const DeprecatedList = forwardRef<
  HTMLUListElement,
  ComponentProps<typeof ListBase>
>((props, ref) => {
  return <ListBase role="listbox" ref={ref} {...props} />;
});
DeprecatedList.displayName = "DeprecatedList";

export const DeprecatedListItem = forwardRef<
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
      tabIndex={state === "disabled" ? -1 : 0}
      role="option"
      {...(state === "disabled" ? { "aria-disabled": true } : undefined)}
      {...(state === "selected" ? { "aria-selected": true } : undefined)}
      {...(current ? { "aria-current": true } : undefined)}
      {...props}
    >
      {prefix}
      <Flex
        css={{ gridColumn: 2, cursor: "default" }}
        align="center"
        justify="between"
      >
        <Text
          variant="labelsSentenceCase"
          truncate
          color={state === "disabled" ? "subtle" : "main"}
        >
          {children}
        </Text>
        {suffix}
      </Flex>
    </ListItemBase>
  );
});
DeprecatedListItem.displayName = "DeprecatedListItem";

type UseList<Item = unknown> = {
  items: Array<Item>;
  selectedIndex: number;
  currentIndex: number;
  onSelect: (index: number) => void;
  onChangeCurrent: (index: number) => void;
};

export const useDeprecatedList = ({
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
      onMouseLeave() {
        onSelect(-1);
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
            const nextIndex = findNextListItemIndex(
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
        const isFocusWithin =
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget);
        if (isFocusWithin === false) {
          onSelect(-1);
        }
      },
    };
  };

  return { getItemProps, getListProps };
};
