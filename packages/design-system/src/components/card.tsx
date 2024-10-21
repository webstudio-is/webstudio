import { styled } from "../stitches.config";
import { theme } from "../stitches.config";

export const Card = styled("div", {
  appearance: "none",
  border: "none",
  boxSizing: "border-box",
  font: "inherit",
  lineHeight: "1",
  outline: "none",
  textAlign: "inherit",
  verticalAlign: "middle",
  WebkitTapHighlightColor: "rgba(0, 0, 0, 0)",
  backgroundColor: "white",
  display: "block",
  textDecoration: "none",
  color: "inherit",
  flexShrink: 0,
  borderRadius: theme.borderRadius[5],
  position: "relative",

  "&::before": {
    boxSizing: "border-box",
    content: '""',
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.1)",
    borderRadius: theme.borderRadius[7],
    pointerEvents: "none",
  },

  variants: {
    size: {
      1: {
        width: theme.spacing[30],
        padding: theme.spacing[11],
      },
    },
  },
  defaultVariants: {
    size: "1",
  },
});
