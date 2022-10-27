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
  background: "none",
  outline: "2px solid transparent",
  outlineOffset: 2,
  "&::before, &::after": {
    boxSizing: "border-box",
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
        height: "$3",
        width: "$3",
        "&:hover, &:focus": {
          background: "none",
          borderColor: "transparent",
        },
      },
      "2": {
        borderRadius: "$1",
        height: "$6",
        width: "$6",
      },
      "3": {
        borderRadius: "$1",
        height: "$7",
        width: "$7",
      },
      "4": {
        borderRadius: "$2",
        height: "$8",
        width: "$8",
      },
    },
    variant: {
      regular: {
        color: "$hiContrast",
        "&:hover, &:active": {
          backgroundColor: "$slate6",
          outline: "none",
        },
        "&:focus": {
          backgroundColor: "$slate6",
          outline: "none",
          border: "2px solid white",
          boxShadow:
            "0px 0px 0px 2px $colors$blue10, 0px 0px 0px 2px $colors$blue10",
        },
      },
      itemAction: {
        color: "$slate9",
        height: "$4",
        width: "$4",
        borderRadius: 3,
        border: "2px solid transparent",
        "&:hover, &:focus-visible": {
          color: "$hiContrast",
        },
        "&:focus-visible": {
          borderColor: "$blue10",
        },
      },
      selectedItemAction: {
        color: "$loContrast",
        "&:hover, &:focus-visible": {
          color: "$slate7",
        },
      },
    },
  },
  defaultVariants: {
    size: "1",
    variant: "regular",
  },
});
