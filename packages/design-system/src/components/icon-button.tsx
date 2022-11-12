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
  fontSize: "$fontSize$4",
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
    backgroundColor: "$slate6",
    outline: "none",
  },
  "&:focus": {
    backgroundColor: "$slate6",
    outline: "none",
    border: "2px solid white",
    boxShadow: "0px 0px 0px 2px $colors$blue10, 0px 0px 0px 2px $colors$blue10",
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
        height: "$spacing$9",
        width: "$spacing$9",
        "&:hover, &:focus": {
          background: "none",
          border: "none",
        },
      },
      "2": {
        borderRadius: "$borderRadius$4",
        height: "$spacing$13",
        width: "$spacing$13",
      },
      "3": {
        borderRadius: "$borderRadius$4",
        height: "$spacing$17",
        width: "$spacing$17",
      },
      "4": {
        borderRadius: "$borderRadius$6",
        height: "$spacing$19",
        width: "$spacing$19",
      },
    },
  },
  defaultVariants: {
    size: "1",
  },
});
