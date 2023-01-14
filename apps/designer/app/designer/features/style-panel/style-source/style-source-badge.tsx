import { styled, Text } from "@webstudio-is/design-system";

export const StyleSourceBadge = styled(Text, {
  display: "inline-flex",
  borderRadius: "$borderRadius$2",
  px: "$spacing$3",
  height: "$spacing$9",
  color: "$colors$foregroundContrastMain",
  alignItems: "center",
  variants: {
    source: {
      token: {
        backgroundColor: "$colors$backgroundStyleSourceToken",
      },
      tag: {
        backgroundColor: "$colors$backgroundStyleSourceTag",
      },
      state: {
        backgroundColor: "$colors$backgroundStyleSourceState",
      },
    },
  },
});
