import { styled, theme } from "../stitches.config";
import { textVariants } from "./text";

export const Chip = styled("span", textVariants.labels, {
  boxSizing: "border-box",
  minWidth: 0,
  maxWidth: "100%",
  height: theme.spacing[9],
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  px: theme.spacing[3],
  borderRadius: theme.borderRadius[3],
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  userSelect: "none",
  fontVariantNumeric: "tabular-nums",
  textDecoration: "none",

  "&:focus-visible": {
    outline: `1px solid ${theme.colors.borderFocus}`,
    outlineOffset: "1px",
  },

  variants: {
    color: {
      neutral: {
        backgroundColor: theme.colors.foregroundTextSubtle,
        color: theme.colors.foregroundContrastMain,
      },
      green: {
        backgroundColor: theme.colors.backgroundSuccessMain,
        color: theme.colors.foregroundContrastMain,
      },
      purple: {
        backgroundColor: theme.colors.backgroundStyleSourceBreakpoint,
        color: theme.colors.foregroundContrastMain,
      },
    },
  },

  defaultVariants: {
    color: "neutral",
  },
});
