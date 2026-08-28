/**
 * Implementation of the "Icon Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3139
 *
 * Also used as "Toggle Button" (see toggle-button.tsx)
 */
import { styled } from "../stitches.config";
import { theme } from "../stitches.config";
import { cssVar } from "../css-var";

const openOrHoverStateStyle = {
  backgroundColor: cssVar("--overlay-interaction-hover"),
};

const withInteractionOverlay = (background: string) =>
  `linear-gradient(${cssVar("--overlay-interaction-hover")}, ${cssVar(
    "--overlay-interaction-hover"
  )}), ${background}`;

const overwrittenBackground = `color-mix(in oklab, ${cssVar(
  "--background-negative"
)} 19.68%, ${cssVar("--background-primary")})`;
const overwrittenBorder = `color-mix(in oklab, ${cssVar(
  "--background-negative"
)} 43.58%, ${cssVar("--background-primary")})`;
const overwrittenForeground = `oklch(from color-mix(in oklab, ${cssVar(
  "--background-negative"
)} 80%, ${cssVar("--foreground-primary")}) l calc(c * 1.23) calc(h + 1.8))`;
const remoteBackground = `oklch(from ${cssVar(
  "--background-warning-subtle"
)} l c calc(h - 50))`;
const remoteBorder = `oklch(from ${cssVar(
  "--border-warning"
)} l c calc(h - 50))`;
const remoteForeground = `oklch(from ${cssVar(
  "--foreground-warning"
)} l c calc(h - 50))`;

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
          backgroundColor: cssVar("--background-secondary"),
          borderColor: cssVar("--border-default"),

          "&:hover, &[data-hovered=true]": {
            background: withInteractionOverlay(
              cssVar("--background-secondary")
            ),
          },
        },
        "&[data-focused=true], &:focus-visible": {
          borderColor: cssVar("--border-focus"),
        },
        ...disabledVariantStyles,
      },

      preset: {
        backgroundColor: cssVar("--background-secondary"),
        borderColor: cssVar("--border-default"),
        color: cssVar("--foreground-primary"),
        "&:hover, &[data-hovered=true]": {
          background: withInteractionOverlay(cssVar("--background-secondary")),
        },
        ...disabledVariantStyles,
      },

      local: {
        backgroundColor: cssVar("--background-informative-subtle"),
        borderColor: cssVar("--border-informative"),
        color: cssVar("--foreground-informative"),
        "&:hover, &[data-hovered=true]": {
          background: withInteractionOverlay(
            cssVar("--background-informative-subtle")
          ),
        },
        ...disabledVariantStyles,
      },

      overwritten: {
        backgroundColor: overwrittenBackground,
        borderColor: overwrittenBorder,
        color: overwrittenForeground,
        "&:hover, &[data-hovered=true]": {
          background: withInteractionOverlay(overwrittenBackground),
        },
        ...disabledVariantStyles,
      },

      remote: {
        backgroundColor: remoteBackground,
        borderColor: remoteBorder,
        color: remoteForeground,
        "&:hover, &[data-hovered=true]": {
          background: withInteractionOverlay(remoteBackground),
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
