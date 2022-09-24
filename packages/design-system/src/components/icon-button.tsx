import { styled } from "../stitches.config";

export const IconButton = styled("button", {
  // Reset
  alignItems: "center",
  appearance: "none",
  borderWidth: "0",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: 0,
  fontFamily: "inherit",
  fontSize: "14px",
  justifyContent: "center",
  lineHeight: "1",
  padding: 0,
  textDecoration: "none",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  color: "$hiContrast",
  background: "none",
  outline: "2px solid transparent",
  outlineOffset: 2,
  "&::before, &::after": {
    boxSizing: "border-box",
  },
  "&:hover, &:active": {
    backgroundColor: "$slate5",
    outline: "none",
  },
  "&:focus": {
    backgroundColor: "$slate5",
    outline: "none",
  },
  "&:disabled": {
    pointerEvents: "none",
    backgroundColor: "transparent",
    color: "$slate6",
  },

  variants: {
    size: {
      "1": {
        borderRadius: 2,
        height: "$5",
        width: "min($5, 100%)",
      },
      "2": {
        borderRadius: "$1",
        height: "$6",
        width: "min($6, 100%)",
      },
      "3": {
        borderRadius: "$1",
        height: "$7",
        width: "min($7, 100%)",
      },
      "4": {
        borderRadius: "$2",
        height: "$8",
        width: "min($8, 100%)",
      },
    },
    state: {
      active: {
        color: "$loContrast",
        backgroundColor: "$blue10",
      },
    },
  },
  defaultVariants: {
    size: "1",
  },
});
