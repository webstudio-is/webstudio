/**
 * Implementation of the "Icon Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3139
 *
 * Also used as "Toggle Button" (see toggle-button.tsx)
 */
import { styled } from "../stitches.config";
import { theme } from "../stitches.config";

const openOrHoverStateStyle = {
  backgroundColor: theme.background["secondary-hover"],
};

const disabledVariantStyles = {
  "&:disabled, &[aria-disabled=true]": {
    color: theme.foreground.disabled,
    "&:hover": {
      backgroundColor: theme.colors.backgroundHover,
    },
  },
};

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
  minWidth: theme.sizes.controlHeight,
  width: "max-content",
  height: theme.sizes.controlHeight,
  borderRadius: theme.borderRadius[3],
  outline: "none",

  "&[data-focused=true], &:focus-visible": {
    borderColor: theme.border.focus,
  },

  "&:disabled, &[aria-disabled=true]": {
    borderColor: "transparent",
    backgroundColor: "transparent",
  },

  // https://www.radix-ui.com/docs/primitives/components/popover#trigger
  "&[data-state=open]": openOrHoverStateStyle,

  variants: {
    variant: {
      default: {
        color: theme.foreground.primary,
        "&:hover, &[data-hovered=true]": openOrHoverStateStyle,
        // According to the design https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3199&t=lpT9jFuaiUnz1Foa-0
        // only the default variant has different toggle state
        // https://www.radix-ui.com/docs/primitives/components/toggle#root
        "&[data-state=on]": {
          backgroundColor: theme.background.muted,
          borderColor: theme.border.default,

          "&:hover, &[data-hovered=true]": openOrHoverStateStyle,
        },
        "&[data-focused=true], &:focus-visible": {
          borderColor: theme.border.focus,
        },
        ...disabledVariantStyles,
      },

      preset: {
        backgroundColor: theme.background.muted,
        borderColor: theme.border.default,
        color: theme.foreground.primary,
        "&:hover, &[data-hovered=true]": {
          backgroundColor: theme.background["secondary-hover"],
        },
        ...disabledVariantStyles,
      },

      local: {
        backgroundColor: theme.background["informative-subtle"],
        borderColor: theme.border.informative,
        color: theme.foreground.informative,
        "&:hover, &[data-hovered=true]": {
          backgroundColor: theme.background["informative-subtle-hover"],
        },
        ...disabledVariantStyles,
      },

      overwritten: {
        backgroundColor: theme.background["negative-subtle"],
        borderColor: theme.border.negative,
        color: theme.foreground.negative,
        "&:hover, &[data-hovered=true]": {
          backgroundColor: theme.background["negative-subtle-hover"],
        },
        ...disabledVariantStyles,
      },

      remote: {
        backgroundColor: theme.background["warning-subtle"],
        borderColor: theme.border.warning,
        color: theme.foreground.warning,
        "&:hover, &[data-hovered=true]": {
          backgroundColor: theme.background["warning-subtle-hover"],
        },
        ...disabledVariantStyles,
      },
    },
    state: {
      open: openOrHoverStateStyle,
    },
  },

  defaultVariants: {
    variant: "default",
  },
});

IconButton.displayName = "IconButton";
