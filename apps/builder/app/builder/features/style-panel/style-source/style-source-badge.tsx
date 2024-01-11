import { styled, Text } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";

export const StyleSourceBadge = styled(Text, {
  display: "inline-flex",
  borderRadius: theme.borderRadius[2],
  px: theme.spacing[3],
  height: theme.spacing[9],
  color: theme.colors.foregroundContrastMain,
  alignItems: "center",
  maxWidth: "100%",
  whiteSpace: "nowrap",
  overflow: "hidden",
  // @tood doesn't work in tooltips, needs a workaround
  textOverflow: "ellipsis",
  variants: {
    source: {
      local: {
        backgroundColor: theme.colors.backgroundStyleSourceLocal,
      },
      token: {
        backgroundColor: theme.colors.backgroundStyleSourceToken,
      },
      componentToken: {
        backgroundColor: theme.colors.backgroundStyleSourceToken,
      },
      tag: {
        backgroundColor: theme.colors.backgroundStyleSourceTag,
      },
      breakpoint: {
        backgroundColor: theme.colors.backgroundStyleSourceBreakpoint,
      },
      instance: {
        backgroundColor: theme.colors.backgroundNeutralMain,
        color: theme.colors.foregroundMain,
      },
    },
  },
});
