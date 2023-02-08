/**
 * Implementation of the "Toolbar Toggle" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=1512%3A7422&t=BOWCrlme5NepfLUm-4
 */
import * as ToolbarPrimitive from "@radix-ui/react-toolbar";
import { css, styled, theme } from "../stitches.config";
import { separatorStyle } from "./separator";

export const Toolbar = styled(ToolbarPrimitive.Root, {
  display: "flex",
  height: theme.spacing[15],
  background: theme.colors.backgroundTopbar,
  color: theme.colors.foregroundContrastMain,
  alignItems: "center",
});

export const ToolbarToggleGroup = styled(ToolbarPrimitive.ToggleGroup, {
  display: "flex",
  alignItems: "center",
});

// It is inside the button, so we need it as a separate element.
const toolbarItemFocusRing = {
  "&::after": {
    content: '""',
    position: "absolute",
    width: theme.spacing[12],
    height: theme.spacing[12],
    outlineWidth: 2,
    outlineStyle: "solid",
    outlineColor: theme.colors.borderFocus,
    borderRadius: theme.borderRadius[3],
  },
};

export const toggleItemStyle = css({
  // reset styles
  boxSizing: "border-box",
  padding: 0,
  appearance: "none",
  border: "none",
  outline: "none",
  // center icon
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  // prevent shrinking inside flex box
  flexShrink: 0,
  // set size and shape
  width: theme.spacing["15"],
  height: theme.spacing["15"],

  color: "inherit",
  background: "transparent",

  "&:focus-visible": toolbarItemFocusRing,
  "&:hover, &[data-state='on'], &[data-state='open']": {
    background: theme.colors.backgroundButtonHover,
  },
  variants: {
    // Just for story
    focused: {
      true: toolbarItemFocusRing,
    },
  },
});

export const ToolbarToggleItem = styled(
  ToolbarPrimitive.ToggleItem,
  toggleItemStyle
);

export const ToolbarSeparator = styled(
  ToolbarPrimitive.Separator,
  separatorStyle,
  { background: theme.colors.borderDark }
);
