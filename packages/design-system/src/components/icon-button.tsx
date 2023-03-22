/**
 * Implementation of the "Icon Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3139
 *
 * Also used as "Toggle Button" (see toggle-button.tsx)
 */
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

  "&[data-focused=true], &:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
  },

  "&:disabled": {
    borderColor: "transparent",
    pointerEvents: "none",
  },

  // https://www.radix-ui.com/docs/primitives/components/popover#trigger
  "&[data-state=open]": {
    borderColor: "transparent",
    backgroundColor: theme.colors.backgroundActive,
    color: theme.colors.foregroundContrastMain,
    "&:hover": {
      borderColor: "transparent",
      backgroundColor: theme.colors.backgroundActive,
      color: theme.colors.foregroundContrastMain,
    },
  },

  variants: {
    variant: {
      default: {
        color: theme.colors.foregroundMain,
        "&:hover": {
          backgroundColor: theme.colors.backgroundHover,
        },
        "&:disabled": {
          color: theme.colors.foregroundDisabled,
        },
        // According to the design https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3199&t=lpT9jFuaiUnz1Foa-0
        // only the default variant has different toggle state
        // https://www.radix-ui.com/docs/primitives/components/toggle#root
        "&[data-state=on]": {
          backgroundColor: theme.colors.backgroundPresetMain,

          "&:hover": {
            backgroundColor: theme.colors.backgroundHover,
          },
        },
      },

      preset: {
        backgroundColor: theme.colors.backgroundPresetMain,
        borderColor: theme.colors.borderMain,
        color: theme.colors.foregroundMain,
        "&:hover": {
          backgroundColor: theme.colors.backgroundPresetHover,
        },
        "&:disabled": {
          color: theme.colors.foregroundDisabled,
        },
      },

      local: {
        backgroundColor: theme.colors.backgroundLocalMain,
        borderColor: theme.colors.borderLocalMain,
        color: theme.colors.foregroundLocalMain,
        "&:hover": {
          backgroundColor: theme.colors.backgroundLocalHover,
        },
        "&:disabled": {
          color: theme.colors.foregroundDisabled,
        },
      },

      remote: {
        backgroundColor: theme.colors.backgroundRemoteMain,
        borderColor: theme.colors.borderRemoteMain,
        color: theme.colors.foregroundRemoteMain,
        "&:hover": {
          backgroundColor: theme.colors.backgroundRemoteHover,
        },
        "&:disabled": {
          color: theme.colors.foregroundDisabled,
        },
      },
    },
  },

  defaultVariants: {
    variant: "default",
  },
});

IconButton.displayName = "IconButton";
