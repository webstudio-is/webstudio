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
  height: "$5",
  px: "$2",
  fontFamily: "$sans",
  fontSize: "$2",
  fontWeight: 500,
  fontVariantNumeric: "tabular-nums",

  "&:disabled": {
    backgroundColor: "$slate2",
    boxShadow: "inset 0 0 0 1px $colors$muted",
    color: "$slate8",
    pointerEvents: "none",
  },

  variants: {
    size: {
      "1": {
        borderRadius: "$1",
        height: "$5",
        px: "$3",
        fontSize: "$1",
      },
      "2": {
        borderRadius: "$2",
        height: 28, // @todo waiting for the sizing scale
        px: "$3",
        fontSize: "$3",
      },
      "3": {
        borderRadius: "$2",
        height: "$7",
        px: "$4",
        fontSize: "$4",
      },
    },
    variant: {
      gray: {
        backgroundColor: "$loContrast",
        boxShadow: "inset 0 0 0 1px $colors$muted",
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
        backgroundColor: "$primary",
        color: "white",
        "@hover": {
          "&:hover": {
            backgroundColor: "$loContrast",
            color: "$primary",
            boxShadow: "inset 0 0 0 1.5px $colors$primary",
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
      green: {
        backgroundColor: "$green2",
        boxShadow: "inset 0 0 0 1px $colors$green7",
        color: "$green11",
        "@hover": {
          "&:hover": {
            boxShadow: "inset 0 0 0 1px $colors$green8",
          },
        },
        "&:active": {
          backgroundColor: "$green3",
          boxShadow: "inset 0 0 0 1px $colors$green8",
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$green8, 0 0 0 1px $colors$green8",
        },
        '&[data-state="open"]': {
          backgroundColor: "$green4",
          boxShadow: "inset 0 0 0 1px $colors$green8",
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
      transparentWhite: {
        backgroundColor: "hsla(0,100%,100%,.2)",
        color: "white",
        "@hover": {
          "&:hover": {
            backgroundColor: "hsla(0,100%,100%,.25)",
          },
        },
        "&:active": {
          backgroundColor: "hsla(0,100%,100%,.3)",
        },
        "&:focus": {
          boxShadow:
            "inset 0 0 0 1px hsla(0,100%,100%,.35), 0 0 0 1px hsla(0,100%,100%,.35)",
        },
      },
      raw: {
        background: "transparent",
        color: "inherit",
        padding: 0,
        borderRadius: 0,
        height: "auto",
      },
      transparentBlack: {
        backgroundColor: "hsla(0,0%,0%,.2)",
        color: "black",
        "@hover": {
          "&:hover": {
            backgroundColor: "hsla(0,0%,0%,.25)",
          },
        },
        "&:active": {
          backgroundColor: "hsla(0,0%,0%,.3)",
        },
        "&:focus": {
          boxShadow:
            "inset 0 0 0 1px hsla(0,0%,0%,.35), 0 0 0 1px hsla(0,0%,0%,.35)",
        },
      },
    },
    state: {
      active: {
        backgroundColor: "$slate4",
        boxShadow: "inset 0 0 0 1px $colors$slate8",
        color: "$slate11",
        "@hover": {
          "&:hover": {
            backgroundColor: "$muted",
            boxShadow: "inset 0 0 0 1px $colors$slate8",
          },
        },
        "&:active": {
          backgroundColor: "$muted",
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$slate8, 0 0 0 1px $colors$slate8",
        },
      },
      waiting: {
        backgroundColor: "$slate4",
        boxShadow: "inset 0 0 0 1px $colors$slate8",
        color: "transparent",
        pointerEvents: "none",
        "@hover": {
          "&:hover": {
            backgroundColor: "$muted",
            boxShadow: "inset 0 0 0 1px $colors$slate8",
          },
        },
        "&:active": {
          backgroundColor: "$muted",
        },
        "&:focus": {
          boxShadow: "inset 0 0 0 1px $colors$slate8",
        },
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
            "0px 0px 0px 2px $colors$primary, 0px 0px 0px 2px $colors$primary",
        },
        '&[data-state="open"]': {
          backgroundColor: "$blueA4",
          boxShadow: "none",
        },
      },
    },
    {
      variant: "green",
      ghost: "true",
      css: {
        backgroundColor: "transparent",
        "@hover": {
          "&:hover": {
            backgroundColor: "$greenA3",
            boxShadow: "none",
          },
        },
        "&:active": {
          backgroundColor: "$greenA4",
        },
        "&:focus": {
          boxShadow:
            "inset 0 0 0 1px $colors$greenA8, 0 0 0 1px $colors$greenA8",
        },
        '&[data-state="open"]': {
          backgroundColor: "$greenA4",
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
