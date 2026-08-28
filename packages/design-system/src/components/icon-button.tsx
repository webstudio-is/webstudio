/**
 * Implementation of the "Icon Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3139
 *
 * Also used as "Toggle Button" (see toggle-button.tsx)
 */
import { styled } from "../stitches.config";
import { theme } from "../stitches.config";

const openOrHoverStateStyle = {
  backgroundColor: theme.colors.backgroundNeutralHover,
};

const disabledVariantStyles = {
  "&:disabled, &[aria-disabled=true]": {
    color: theme.colors.contentDisabled,
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
    borderColor: theme.colors.borderFocus,
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
        color: theme.colors.contentPrimary,
        "&:hover, &[data-hovered=true]": openOrHoverStateStyle,
        // According to the design https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3199&t=lpT9jFuaiUnz1Foa-0
        // only the default variant has different toggle state
        // https://www.radix-ui.com/docs/primitives/components/toggle#root
        "&[data-state=on]": {
          backgroundColor: theme.colors.backgroundNeutral,
          borderColor: theme.colors.borderDefault,

          "&:hover, &[data-hovered=true]": openOrHoverStateStyle,
        },
        "&[data-focused=true], &:focus-visible": {
          borderColor: theme.colors.borderFocus,
        },
        ...disabledVariantStyles,
      },

      preset: {
        backgroundColor: theme.colors.backgroundNeutral,
        borderColor: theme.colors.borderDefault,
        color: theme.colors.contentPrimary,
        "&:hover, &[data-hovered=true]": {
          backgroundColor: theme.colors.backgroundNeutralHover,
        },
        ...disabledVariantStyles,
      },

      local: {
        backgroundColor: theme.colors.backgroundInformativeSubtle,
        borderColor: theme.colors.borderInformative,
        color: theme.colors.contentInformative,
        "&:hover, &[data-hovered=true]": {
          backgroundColor: theme.colors.backgroundInformativeSubtleHover,
        },
        ...disabledVariantStyles,
      },

      overwritten: {
        backgroundColor: theme.colors.backgroundNegativeSubtle,
        borderColor: theme.colors.borderNegative,
        color: theme.colors.contentNegative,
        "&:hover, &[data-hovered=true]": {
          backgroundColor: theme.colors.backgroundNegativeSubtleHover,
        },
        ...disabledVariantStyles,
      },

      remote: {
        backgroundColor: theme.colors.backgroundWarningSubtle,
        borderColor: theme.colors.borderWarning,
        color: theme.colors.contentWarning,
        "&:hover, &[data-hovered=true]": {
          backgroundColor: theme.colors.backgroundWarningSubtleHover,
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
