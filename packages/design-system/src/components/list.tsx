import { ComponentProps, forwardRef } from "react";
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
  gridTemplateColumns: "$4 1fr",
  alignItems: "center",
  justifyContent: "space-between",
  height: "$5",
  px: "$1",
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
