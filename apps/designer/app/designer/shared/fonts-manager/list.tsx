import { Flex, styled, Text } from "@webstudio-is/design-system";
import { CheckIcon } from "@webstudio-is/icons";
import { ComponentProps, forwardRef } from "react";
import { getItemMenuVars } from "./item-menu";

export const Listbox = styled("ul", {
  display: "flex",
  flexDirection: "column",
  margin: 0,
  padding: 0,
  variants: {
    isEmpty: {
      true: {
        display: "none",
      },
    },
  },
});

const ListboxItemBase = styled("li", {
  display: "grid",
  gridTemplateColumns: "$4 1fr",
  alignItems: "center",
  justifyContent: "space-between",
  height: "$5",
  px: "$1",
  listStyle: "none",
  borderRadius: "$1",
  outline: 0,
  "&:focus-within, &[data-highlighted], &[aria-selected=true]": {
    boxShadow: "0px 0px 0px 2px $colors$blue10, 0px 0px 0px 2px $colors$blue10",
    ...getItemMenuVars("visible"),
  },
  "&[disabled]": {
    pointerEvents: "none",
  },
});

export const ListboxItem = forwardRef<
  HTMLLIElement,
  ComponentProps<typeof ListboxItemBase> & {
    highlighted?: boolean;
    disabled: boolean;
    selected: boolean;
    suffix?: JSX.Element;
  }
>(
  (
    {
      highlighted,
      disabled = false,
      selected = false,
      children,
      suffix,
      ...props
    },
    ref
  ) => {
    return (
      <ListboxItemBase
        {...props}
        ref={ref}
        {...(highlighted ? { ["data-highlighted"]: true } : {})}
        {...(disabled ? { ["aria-disabled"]: true, disabled: true } : {})}
        tabIndex={disabled ? -1 : 0}
      >
        {selected && <CheckIcon />}
        <Flex css={{ gridColumn: 2 }} align="center">
          <Text variant="label" truncate color={disabled ? "hint" : "contrast"}>
            {children}
          </Text>
          {suffix}
        </Flex>
      </ListboxItemBase>
    );
  }
);
ListboxItem.displayName = "ListboxItem";
