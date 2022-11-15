import { styled } from "../stitches.config";

export const Button = styled("button", {
  // Reset
  all: "unset",
  alignItems: "center",
  boxSizing: "border-box",
  border: "none",
  userSelect: "none",
  transition: "all 150ms ease-out",
  "&::before": {
    boxSizing: "border-box",
  },
  "&::after": {
    boxSizing: "border-box",
  },

  // Custom reset?
  display: "inline-flex",
  flexShrink: 0,
  justifyContent: "center",
  lineHeight: 1,
  WebkitTapHighlightColor: "rgba(0,0,0,0)",

  // Custom
  height: "$spacing$11",
  px: "$spacing$5",
  fontFamily: "$sans",
  fontSize: "$fontSize$3",
  fontWeight: 500,
  fontVariantNumeric: "tabular-nums",

  "&:disabled": {
    backgroundColor: "$slate2",
    boxShadow: "inset 0 0 0 1px $colors$slate7",
    color: "$slate8",
    pointerEvents: "none",
  },

  variants: {
    size: {
      "1": {
        borderRadius: "$borderRadius$4",
        height: "$spacing$11",
        px: "$spacing$9",
        fontSize: "$fontSize$3",
      },
      "2": {
        borderRadius: "$borderRadius$6",
        height: 28, // @todo waiting for the sizing scale
        px: "$spacing$9",
        fontSize: "$fontSize$4",
      },
      "3": {
        borderRadius: "$borderRadius$6",
        height: "$spacing$17",
        px: "$spacing$10",
        fontSize: "$fontSize$4",
      },
    },
    variant: {
      gray: {
        backgroundColor: "$loContrast",
        boxShadow: "inset 0 0 0 1px $colors$slate7",
        color: "$hiContrast",
        "@hover": {
          "&:hover": {
            boxShadow: "inset 0 0 0 1px $colors$slate8",
          },
        },
        "&:active": {
          backgroundColor: "$slate2",
          boxShadow: "inset 0 0 0 1px $colors$slate8",
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$slate8, 0 0 0 1px $colors$slate8",
        },
        '&[data-state="open"]': {
          backgroundColor: "$slate4",
          boxShadow: "inset 0 0 0 1px $colors$slate8",
        },
      },
      blue: {
        backgroundColor: "$blue10",
        color: "white",
        "@hover": {
          "&:hover": {
            backgroundColor: "$loContrast",
            color: "$blue10",
            boxShadow: "inset 0 0 0 1.5px $colors$blue10",
          },
        },
        "&:active": {
          boxShadow: "inset 0 0 0 1.5px $colors$blue8",
        },
        "&:focus": {
          boxShadow:
            "inset 0 0 0 1.5px $colors$blue8, 0 0 0 1.5px $colors$blue8",
        },
        '&[data-state="open"]': {
          boxShadow: "inset 0 0 0 1.5px $colors$blue8",
        },
      },
      red: {
        backgroundColor: "$loContrast",
        boxShadow: "inset 0 0 0 1px $colors$red10",
        color: "$red10",
        "@hover": {
          "&:hover": {
            background: "$red10",
            color: "$loContrast",
          },
        },
        "&:active": {
          backgroundColor: "$red11",
          color: "$loContrast",
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$red8, 0 0 0 1px $colors$red8",
        },
        '&[data-state="open"]': {
          backgroundColor: "$red4",
          boxShadow: "inset 0 0 0 1px $colors$red8",
        },
      },
      raw: {
        background: "transparent",
        color: "inherit",
        padding: 0,
        borderRadius: 0,
        height: "auto",
      },
    },
    ghost: {
      true: {
        backgroundColor: "transparent",
        boxShadow: "none",
      },
    },
  },
  compoundVariants: [
    {
      variant: "gray",
      ghost: "true",
      css: {
        backgroundColor: "transparent",
        color: "$hiContrast",
        "@hover": {
          "&:hover": {
            backgroundColor: "$slateA3",
            boxShadow: "none",
          },
        },
        "&:active": {
          backgroundColor: "$slateA4",
        },
        "&:focus": {
          boxShadow:
            "inset 0 0 0 1px $colors$slateA8, 0 0 0 1px $colors$slateA8",
        },
        '&[data-state="open"]': {
          backgroundColor: "$slateA4",
          boxShadow: "none",
        },
      },
    },
    {
      variant: "blue",
      ghost: "true",
      css: {
        backgroundColor: "transparent",
        "@hover": {
          "&:hover": {
            backgroundColor: "$blueA3",
            boxShadow: "none",
          },
        },
        "&:active": {
          backgroundColor: "$blueA4",
        },
        "&:focus": {
          boxShadow:
            "0px 0px 0px 2px $colors$blue10, 0px 0px 0px 2px $colors$blue10",
        },
        '&[data-state="open"]': {
          backgroundColor: "$blueA4",
          boxShadow: "none",
        },
      },
    },
    {
      variant: "red",
      ghost: "true",
      css: {
        backgroundColor: "transparent",
        "@hover": {
          "&:hover": {
            backgroundColor: "$redA3",
            boxShadow: "none",
          },
        },
        "&:active": {
          backgroundColor: "$redA4",
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$redA8, 0 0 0 1px $colors$redA8",
        },
        '&[data-state="open"]': {
          backgroundColor: "$redA4",
          boxShadow: "none",
        },
      },
    },
  ],
  defaultVariants: {
    size: "1",
    variant: "gray",
  },
});
