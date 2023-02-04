/**
 * Implementation of the "Toolbar Toggle" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=1512%3A7422&t=BOWCrlme5NepfLUm-4
 */
import { styled, theme } from "../stitches.config";
import * as Toggle from "@radix-ui/react-toggle";

// It is inside the button, so we need it as a separate element.
const focusRing = {
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

export const ToolbarToggle = styled(Toggle.Root, {
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

  "&:focus-visible": focusRing,
  "&:hover, &[data-state='on']": {
    background: theme.colors.backgroundButtonHover,
  },
  variants: {
    // Just for story
    focused: {
      true: focusRing,
    },
  },
});
