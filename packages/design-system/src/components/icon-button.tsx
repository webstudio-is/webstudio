import { styled } from "../stitches.config";

export const IconButton = styled("button", {
  // reset styles
  boxSizing: "border-box",
  padding: 0,
  appearance: "none",
  backgroundColor: "transparent",
  border: "1px solid transparent",
  // center icon
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  // prevent shrinking inside flex box
  flexShrink: 0,
  // set size and shape
  width: 28,
  height: 28,
  borderRadius: "$borderRadius$3",

  "&:focus-visible": {
    outline: "2px solid $blue10",
  },
  "&:disabled": {
    borderColor: "transparent",
    pointerEvents: "none",
  },

  variants: {
    variant: {
      default: {
        color: "$slate12",
        "&:hover": {
          backgroundColor: "$slate6",
        },
        "&:disabled": {
          color: "$slate8",
        },
      },
      preset: {
        backgroundColor: "$slate6",
        borderColor: "$slate8",
        color: "$slate12",
        "&:hover": {
          backgroundColor: "$slate8",
        },
        "&:disabled": {
          color: "$slate8",
        },
      },
      set: {
        backgroundColor: "$blue4",
        borderColor: "$blue6",
        color: "$blue11",
        "&:hover": {
          backgroundColor: "$blue6",
        },
        "&:disabled": {
          color: "$blue6",
        },
      },
      inherited: {
        backgroundColor: "$orange4",
        borderColor: "$orange6",
        color: "$orange11",
        "&:hover": {
          backgroundColor: "$orange6",
        },
        "&:disabled": {
          color: "$orange6",
        },
      },
      active: {
        backgroundColor: "$blue10",
        color: "White",
        // non-interactive state because usually covered with overlay
      },
    },
  },

  defaultVariants: {
    variant: "default",
  },
});

IconButton.displayName = "IconButton";
