import { styled } from "../stitches.config";

export const IconButton2 = styled("button", {
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

  "&:focus-visible": {
    outline: "2px solid $blue10",
  },
  "&:disabled": {
    color: "$slate8",
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
      },
      setByDefault: {
        backgroundColor: "$slate6",
        borderColor: "$slate8",
        color: "$slate12",
        "&:hover": {
          backgroundColor: "$slate8",
        },
      },
      set: {
        backgroundColor: "$blue4",
        borderColor: "$blue6",
        color: "$blue11",
        "&:hover": {
          backgroundColor: "$blue6",
        },
      },
      inherited: {
        backgroundColor: "$orange4",
        borderColor: "$orange6",
        color: "$orange11",
        "&:hover": {
          backgroundColor: "$orange6",
        },
      },
      active: {
        backgroundColor: "$blue10",
        color: "White",
        // has no hover state because usually covered with overlay
      },
    },
    size: {
      normal: {
        width: 28,
        height: 28,
        borderRadius: 3,
      },
      small: {
        width: 16,
        height: 16,
        borderRadius: 2,
      },
    },
  },

  defaultVariants: {
    variant: "default",
    size: "normal",
  },
});

IconButton2.displayName = "IconButton2";
