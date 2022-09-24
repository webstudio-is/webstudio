import React from "react";
import * as MenuPrimitive from "@radix-ui/react-menu";
import { CheckIcon } from "@webstudio-is/icons";
import { styled, css, CSS } from "../stitches.config";
import { Box } from "./box";
import { panelStyles } from "./panel";

export const baseItemCss = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontFamily: "$untitled",
  fontSize: "$1",
  fontVariantNumeric: "tabular-nums",
  lineHeight: "1",
  cursor: "default",
  userSelect: "none",
  whiteSpace: "nowrap",
  height: "$5",
  px: "$5",
});

export const itemCss = css(baseItemCss, {
  position: "relative",
  color: "$hiContrast",
  "&:focus, &[data-found]": {
    outline: "none",
    backgroundColor: "$blue10",
    color: "white",
  },
  "&[data-disabled]": {
    color: "$slate9",
  },
});

export const labelCss = css(baseItemCss, {
  color: "$slate11",
});

export const menuCss = css({
  boxSizing: "border-box",
  minWidth: 120,
  py: "$1",
});

export const separatorCss = css({
  height: 1,
  my: "$1",
  backgroundColor: "$slate6",
});

export const Menu = styled(MenuPrimitive.Root, menuCss);
export const MenuContent = styled(MenuPrimitive.Content, panelStyles);

export const MenuSeparator = styled(MenuPrimitive.Separator, separatorCss);

export const MenuItem = styled(MenuPrimitive.Item, itemCss);

const StyledMenuRadioItem = styled(MenuPrimitive.RadioItem, itemCss);

type MenuRadioItemPrimitiveProps = React.ComponentProps<
  typeof MenuPrimitive.RadioItem
>;
type MenuRadioItemProps = MenuRadioItemPrimitiveProps & { css?: CSS };

export const MenuRadioItem = React.forwardRef<
  React.ElementRef<typeof StyledMenuRadioItem>,
  MenuRadioItemProps
>(({ children, ...props }, forwardedRef) => (
  <StyledMenuRadioItem {...props} ref={forwardedRef}>
    <Box as="span" css={{ position: "absolute", left: "$1" }}>
      <MenuPrimitive.ItemIndicator>
        <CheckIcon />
      </MenuPrimitive.ItemIndicator>
    </Box>
    {children}
  </StyledMenuRadioItem>
));
MenuRadioItem.displayName = "MenuRadioItem";

const StyledMenuCheckboxItem = styled(MenuPrimitive.CheckboxItem, itemCss);

type MenuCheckboxItemPrimitiveProps = React.ComponentProps<
  typeof MenuPrimitive.CheckboxItem
>;
type MenuCheckboxItemProps = MenuCheckboxItemPrimitiveProps & { css?: CSS };

export const MenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof StyledMenuCheckboxItem>,
  MenuCheckboxItemProps
>(({ children, ...props }, forwardedRef) => (
  <StyledMenuCheckboxItem {...props} ref={forwardedRef}>
    <Box as="span" css={{ position: "absolute", left: "$1" }}>
      <MenuPrimitive.ItemIndicator>
        <CheckIcon />
      </MenuPrimitive.ItemIndicator>
    </Box>
    {children}
  </StyledMenuCheckboxItem>
));
MenuCheckboxItem.displayName = "MenuCheckboxItem";

export const MenuLabel = styled(MenuPrimitive.Label, labelCss);
export const MenuRadioGroup = styled(MenuPrimitive.RadioGroup, {});
export const MenuGroup = styled(MenuPrimitive.Group, {});
export const MenuAnchor = MenuPrimitive.MenuAnchor;
