import { styled } from "@webstudio-is/design-system";
import { ComponentProps, forwardRef } from "react";
import { itemMenuVars } from "./item-menu";

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
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: "$5",
  paddingLeft: "$4",
  listStyle: "none",
  borderRadius: "$1",
  "&[data-highlighted], &[aria-selected=true]": {
    boxShadow:
      "inset 0px 0px 0px 1px $colors$blue10, 0px 0px 0px 1px $colors$blue10",
    [itemMenuVars.visibility]: "visible",
  },
  "&[disabled]": {
    pointerEvents: "none",
    color: "$hint",
  },
});

export const ListboxItem = forwardRef<
  HTMLLIElement,
  ComponentProps<typeof ListboxItemBase> & {
    highlighted: boolean;
    disabled?: boolean;
  }
>(({ highlighted, disabled, ...props }, ref) => {
  return (
    <ListboxItemBase
      {...props}
      ref={ref}
      {...(highlighted ? { ["data-highlighted"]: true } : {})}
      {...(disabled ? { ["aria-disabled"]: true, disabled: true } : {})}
    />
  );
});
ListboxItem.displayName = "ListboxItem";
