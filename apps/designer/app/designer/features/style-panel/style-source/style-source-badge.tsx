import { styled, Text } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";

export const StyleSourceBadge = styled(Text, {
  display: "inline-flex",
  borderRadius: theme.borderRadius[2],
  px: theme.spacing[3],
  height: theme.spacing[9],
  color: theme.colors.foregroundContrastMain,
  alignItems: "center",
  variants: {
    source: {
      token: {
        backgroundColor: theme.colors.backgroundStyleSourceToken,
      },
      tag: {
        backgroundColor: theme.colors.backgroundStyleSourceTag,
      },
      state: {
        backgroundColor: theme.colors.backgroundStyleSourceState,
      },
    },
  },
});
