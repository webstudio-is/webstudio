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
    source: {
      local: {
        backgroundColor: styleSourceColors.local.background,
      },
      token: {
        backgroundColor: styleSourceColors.local.background,
      },
      tag: {
        backgroundColor: styleSourceColors.tag.background,
      },
      breakpoint: {
        backgroundColor: styleSourceColors.breakpoint.background,
      },
      instance: {
        backgroundColor: cssVar("--background-secondary"),
        color: cssVar("--foreground-primary"),
      },
    },
  },
});
