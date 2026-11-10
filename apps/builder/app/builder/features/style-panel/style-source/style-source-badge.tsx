import { cssVar, styled, Text, theme } from "@webstudio-is/design-system";
import { styleSourceColors } from "./color-recipes";

export const StyleSourceBadge = styled(Text, {
  display: "inline-flex",
  borderRadius: theme.borderRadius[2],
  px: theme.spacing[3],
  height: theme.spacing[9],
  color: cssVar("--foreground-on-accent"),
  alignItems: "center",
  maxWidth: "100%",
  whiteSpace: "nowrap",
  overflow: "hidden",
  // @tood doesn't work in tooltips, needs a workaround
  textOverflow: "ellipsis",
  variants: {
    clickable: {
      true: {
        border: 0,
        cursor: "pointer",
        "&:not(:disabled):hover": {
          boxShadow: `inset 0 0 0 1px ${cssVar("--border-focus")}`,
        },
        "&:focus-visible": {
          outline: `2px solid ${cssVar("--border-focus")}`,
          outlineOffset: 2,
        },
        "&:disabled": { cursor: "default" },
      },
    },
    source: {
      local: {
        backgroundColor: styleSourceColors.local.background,
      },
      token: {
        backgroundColor: styleSourceColors.local.background,
      },
      tag: {
        backgroundColor: styleSourceColors.tag.background,
        color: styleSourceColors.tag.foreground,
      },
      breakpoint: {
        backgroundColor: styleSourceColors.breakpoint.background,
      },
      instance: {
        backgroundColor: styleSourceColors.instance.background,
        color: cssVar("--foreground-primary"),
      },
    },
  },
});
