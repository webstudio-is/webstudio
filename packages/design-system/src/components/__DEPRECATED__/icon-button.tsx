import { styled } from "../../stitches.config";
import { theme } from "../../stitches.config";

export const DeprecatedIconButton = styled("button", {
  // Reset
  alignItems: "center",
  appearance: "none",
  borderWidth: "0",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: 0,
  fontFamily: "inherit",
  fontSize: theme.fontSize[4],
  justifyContent: "center",
  lineHeight: "1",
  padding: 0,
  textDecoration: "none",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  color: theme.colors.hiContrast,
  background: "none",
  outline: "2px solid transparent",
  outlineOffset: 2,
  "&::before, &::after": {
    boxSizing: "border-box",
  },
  "&:hover, &:active": {
    backgroundColor: theme.colors.slate6,
    outline: "none",
  },
  "&:focus-visible": {
    backgroundColor: theme.colors.slate6,
    outline: "none",
    border: "2px solid white",
    boxShadow: `0px 0px 0px 2px ${theme.colors.blue10}, 0px 0px 0px 2px ${theme.colors.blue10}`,
  },
  "&:disabled": {
    pointerEvents: "none",
    backgroundColor: "transparent",
    color: theme.colors.slate6,
  },

  variants: {
    size: {
      "1": {
        borderRadius: 2,
        height: theme.spacing[9],
        width: theme.spacing[9],
        "&:hover, &:focus-visible": {
          background: "none",
          border: "none",
        },
      },
      "2": {
        borderRadius: theme.borderRadius[4],
        height: theme.spacing[13],
        width: theme.spacing[13],
      },
      "3": {
        borderRadius: theme.borderRadius[4],
        height: theme.spacing[17],
        width: theme.spacing[17],
      },
      "4": {
        borderRadius: theme.borderRadius[6],
        height: theme.spacing[19],
        width: theme.spacing[19],
      },
    },
  },
  defaultVariants: {
    size: "1",
  },
});
