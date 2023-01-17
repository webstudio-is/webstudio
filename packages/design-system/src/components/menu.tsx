import React from "react";
import * as MenuPrimitive from "@radix-ui/react-menu";
import { CheckIcon } from "@webstudio-is/icons";
import { styled, css, CSS } from "../stitches.config";
import { Box } from "./box";
import { panelStyles } from "./panel";
import { theme } from "../stitches.config";

export const baseItemCss = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontFamily: theme.fonts.sans,
  fontSize: theme.fontSize[3],
  fontVariantNumeric: "tabular-nums",
  lineHeight: "1",
  cursor: "default",
  userSelect: "none",
  whiteSpace: "nowrap",
  height: theme.spacing[11],
  px: theme.spacing[11],
});

export const itemCss = css(baseItemCss, {
  position: "relative",
  color: theme.colors.hiContrast,
  "&:focus, &[data-found], &[aria-selected=true]": {
    outline: "none",
    backgroundColor: theme.colors.blue10,
    color: "white",
  },
  "&[data-disabled], &[aria-disabled]": {
    color: theme.colors.slate9,
  },
});

export const labelCss = css(baseItemCss, {
  color: theme.colors.slate11,
});

export const menuCss = css({
  boxSizing: "border-box",
  minWidth: 120,
  py: theme.spacing[3],
});

export const separatorCss = css({
  height: 1,
  my: theme.spacing[3],
  backgroundColor: theme.colors.slate6,
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
    <Box as="span" css={{ position: "absolute", left: theme.spacing[3] }}>
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
    <Box as="span" css={{ position: "absolute", left: theme.spacing[3] }}>
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
