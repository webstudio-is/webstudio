/**
 * Implementation of the "Icon Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3139
 *
 * Also used as "Toggle Button" (see toggle-button.tsx)
 */
import { styled } from "../stitches.config";
import { theme } from "../stitches.config";
import { cssVar } from "../css-var";
import { styleSourceColor } from "./style-source-color";

const openOrHoverStateStyle = {
  backgroundColor: cssVar("--overlay-interaction-hover"),
};

const withInteractionOverlay = (background: string) =>
  `linear-gradient(${cssVar("--overlay-interaction-hover")}, ${cssVar(
    "--overlay-interaction-hover"
  )}), ${background}`;

const presetBackground = `color-mix(in oklab, ${cssVar(
  "--background-primary"
)} 90.58%, ${cssVar("--foreground-primary")})`;

const disabledVariantStyles = {
  "&:disabled, &[aria-disabled=true]": {
    color: cssVar("--foreground-disabled"),
    "&:hover": {
      backgroundColor: "transparent",
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
    borderColor: cssVar("--border-focus"),
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
        color: cssVar("--foreground-primary"),
        "&:hover, &[data-hovered=true]": openOrHoverStateStyle,
        // According to the design https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3199&t=lpT9jFuaiUnz1Foa-0
        // only the default variant has different toggle state
        // https://www.radix-ui.com/docs/primitives/components/toggle#root
        "&[data-state=on]": {
          backgroundColor: presetBackground,
          borderColor: cssVar("--border-default"),

          "&:hover, &[data-hovered=true]": {
            background: withInteractionOverlay(presetBackground),
          },
        },
        "&[data-focused=true], &:focus-visible": {
          borderColor: cssVar("--border-focus"),
        },
        ...disabledVariantStyles,
      },

      preset: {
        backgroundColor: presetBackground,
        borderColor: cssVar("--border-default"),
        color: cssVar("--foreground-primary"),
        "&:hover, &[data-hovered=true]": {
          background: withInteractionOverlay(presetBackground),
        },
        ...disabledVariantStyles,
      },

      local: {
        backgroundColor: styleSourceColor.local.background,
        borderColor: styleSourceColor.local.border,
        color: styleSourceColor.local.foreground,
        "&:hover, &[data-hovered=true]": {
          background: withInteractionOverlay(styleSourceColor.local.background),
        },
        ...disabledVariantStyles,
      },

      overwritten: {
        backgroundColor: styleSourceColor.overwritten.background,
        borderColor: styleSourceColor.overwritten.border,
        color: styleSourceColor.overwritten.foreground,
        "&:hover, &[data-hovered=true]": {
          background: withInteractionOverlay(
            styleSourceColor.overwritten.background
          ),
        },
        ...disabledVariantStyles,
      },

      remote: {
        backgroundColor: styleSourceColor.remote.background,
        borderColor: styleSourceColor.remote.border,
        color: styleSourceColor.remote.foreground,
        "&:hover, &[data-hovered=true]": {
          background: withInteractionOverlay(
            styleSourceColor.remote.background
          ),
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
