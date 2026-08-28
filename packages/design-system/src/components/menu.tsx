/**
 * Implementation of the "Menu" and "Menu Item" components from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=6%3A2104&t=xHSB8rNf2VXrwLAU-0
 *
 * Only CSS is implemented here, and intended to be used with:
 *  - @radix-ui/react-dropdown-menu
 *  - @radix-ui/react-select
 *  - @radix-ui/react-popper & downshift
 *  - @radix-ui/react-context-menu (@todo, not implemented yet)
 *
 * @todo not implemented yet Figma features:
 *  - Component: "Menu Item Large"
 *  - Type of "Menu" component: "Dropdown w/large items"
 *  - Type of "Menu" component: "Context menu"
 *
 * @todo: group everything under a folder same as floating-panel?
 */

import { css, styled, theme } from "../stitches.config";
import { textVariants } from "./text";
import {
  Arrow as BaseDropdownMenuArrow,
  SubContent,
} from "@radix-ui/react-dropdown-menu";
import { CheckMarkIcon, DotIcon } from "@webstudio-is/icons";
import type { ComponentProps } from "react";
import { truncate } from "../utilities";
import { cssVar } from "../colors/css-var";

export const labelCss = css(textVariants.titles, {
  color: cssVar("--foreground-primary"),
  mx: theme.spacing[3],
  padding: theme.spacing[3],
  order: 1,
  ...truncate(),
});

const indicatorSize = theme.spacing[9];
export const menuItemIndicatorCss = css({
  position: "absolute",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  left: theme.spacing[3],
  width: indicatorSize,
  height: indicatorSize,
});

export const MenuItemIndicator = styled("span", menuItemIndicatorCss);

const itemMargin = theme.spacing[3];
export const menuItemCss = css({
  outline: "none",
  cursor: "default",
  position: "relative",
  display: "flex",
  order: 1,
  alignItems: "center",
  color: cssVar("--foreground-primary"),
  mx: itemMargin,
  padding: theme.spacing[3],
  borderRadius: theme.borderRadius[3],
  // override button default styles
  backgroundColor: "transparent",
  "&:focus, &[data-found], &[aria-selected=true], &[data-state=open], &[data-state=checked]:is(:hover,:focus)":
    {
      backgroundColor: cssVar("--overlay-interaction-hover"),
    },
  "&[data-disabled], &[aria-disabled], &[disabled]": {
    color: cssVar("--foreground-disabled"),
  },
  variants: {
    text: {
      title: textVariants.labels,
      sentence: textVariants.labels,
    },
    withIndicator: {
      true: {
        paddingLeft: `calc(${theme.spacing[3]} + ${indicatorSize} + ${theme.spacing[3]})`,
      },
    },
    destructive: {
      true: {
        color: cssVar("--foreground-negative"),
      },
    },
    hint: {
      true: {
        ...textVariants.labels,
        px: theme.spacing[5],
        background: cssVar("--overlay-interaction-hover"),
        borderRadius: theme.borderRadius[2],
        overflow: "hidden",
        "&::before": {
          position: "absolute",
          top: 0,
          left: 0,
          content: '""',
          width: 2,
          height: "100%",
          background: theme.colors.backgroundGradientVertical,
        },
      },
    },
  },
  defaultVariants: { text: "title" },
});

// To use outside of any menu context, e.g. in a Popover
export const MenuItemButton = styled("button", menuItemCss, {
  border: "none",
  boxSizing: "border-box",
  width: `calc(100% - ${itemMargin} * 2)`,
  "&:focus:not(:focus-visible)": { backgroundColor: "unset" },
  "&:hover:not([diabled])": {
    backgroundColor: cssVar("--overlay-interaction-hover"),
  },
});

export const separatorCss = css({
  height: 1,
  minHeight: 1,
  my: theme.spacing[3],
  backgroundColor: cssVar("--border-default"),
  order: 1,
});

const menuPadding = theme.spacing[3];
const menuBorderWidth = "1px";

export const menuCss = css({
  boxSizing: "border-box",
  borderRadius: theme.borderRadius[6],
  backgroundColor: cssVar("--background-secondary"),
  border: `1px solid ${cssVar("--border-default")}`,
  boxShadow: `${theme.shadows.menuDropShadow}, inset 0 0 0 1px ${cssVar("--background-primary")}`,
  padding: `${menuPadding} 0`,
  variants: {
    width: {
      regular: { width: theme.spacing[26] },
    },
  },
});

export const MenuList = styled("div", menuCss);

export const subMenuCss = css(menuCss, {
  // the goal is to align the top menu item in a sub menu
  // with the menu item in the parent menu that opened it
  marginTop: `calc((${menuPadding} + ${menuBorderWidth}) * -1)`,
});

export const subContentProps: Partial<ComponentProps<typeof SubContent>> = {
  // this depends on menuItemCss.margin and menuCss.padding,
  // the goal is to make sub-menu overlap the parent menu by exactly 2px
  sideOffset: 3,
};

// Arrow is hard to implement with just CSS,
// so we implement it as a component
const ArrowBackground = styled("path", {
  fill: cssVar("--background-secondary"),
});
const ArrowInnerBorder = styled("path", {
  fill: cssVar("--background-primary"),
});
const ArrowOuterBorder = styled("path", { fill: cssVar("--border-default") });
const ArrowSgv = styled("svg", { transform: "translateY(-3px)" });
export const DropdownMenuArrow = () => (
  <BaseDropdownMenuArrow width={16} height={11} asChild>
    <ArrowSgv xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 11">
      <ArrowOuterBorder d="M8.73 9.76a1 1 0 0 1-1.46 0L.5 2.54h15L8.73 9.76Z" />
      <ArrowInnerBorder d="M8.146 8.909a.2.2 0 0 1-.292 0L.5 1.065h15L8.146 8.909Z" />
      <ArrowBackground d="M8.073 7.52a.1.1 0 0 1-.146 0L.877 0h14.246l-7.05 7.52Z" />
    </ArrowSgv>
  </BaseDropdownMenuArrow>
);

const setIconStyle = css({
  color: cssVar("--foreground-accent"),
});

// Icon for the "checked" state from Figma
export const MenuCheckedIcon = () => <CheckMarkIcon size={12} />;

// Icon for the "checked and set" state from Figma
export const MenuCheckedAndSetIcon = () => (
  <CheckMarkIcon className={setIconStyle()} />
);

// Icon for the "set dot" state from Figma
export const MenuSetDotIcon = () => <DotIcon className={setIconStyle()} />;
