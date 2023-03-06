import { styled } from "../stitches.config";
import { theme } from "../stitches.config";

export const IconButton = styled("button", {
  // reset styles
  boxSizing: "border-box",
  padding: 0,
  appearance: "none",
  backgroundColor: "transparent",
  border: "1px solid transparent",
  // center icon
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  // prevent shrinking inside flex box
  flexShrink: 0,
  // set size and shape
  width: 28,
  height: 28,
  borderRadius: theme.borderRadius[3],

  "&:focus-visible": {
    outline: `2px solid ${theme.colors.blue10}`,
  },
  "&:disabled": {
    borderColor: "transparent",
    pointerEvents: "none",
  },
  "&[data-state=open]": {
    backgroundColor: theme.colors.blue10,
    color: theme.colors.foregroundContrastMain,
  },

  variants: {
    variant: {
      default: {
        color: theme.colors.slate12,
        "&:hover": {
          backgroundColor: theme.colors.slate6,
        },
        "&:disabled": {
          color: theme.colors.slate8,
        },
      },
      preset: {
        backgroundColor: theme.colors.slate6,
        borderColor: theme.colors.slate8,
        color: theme.colors.slate12,
        "&:hover": {
          backgroundColor: theme.colors.slate8,
        },
        "&:disabled": {
          color: theme.colors.slate8,
        },
      },
      set: {
        backgroundColor: theme.colors.blue4,
        borderColor: theme.colors.blue6,
        color: theme.colors.blue11,
        "&:hover": {
          backgroundColor: theme.colors.blue6,
        },
        "&:disabled": {
          color: theme.colors.blue6,
        },
      },
      inherited: {
        backgroundColor: theme.colors.orange4,
        borderColor: theme.colors.orange6,
        color: theme.colors.orange11,
        "&:hover": {
          backgroundColor: theme.colors.orange6,
        },
        "&:disabled": {
          color: theme.colors.orange6,
        },
      },
      active: {
        backgroundColor: theme.colors.blue10,
        color: theme.colors.foregroundContrastMain,
        // non-interactive state because usually covered with overlay
      },
    },
  },

  defaultVariants: {
    variant: "default",
  },
});

IconButton.displayName = "IconButton";
