import { styled } from "../../stitches.config";
import { theme } from "../../stitches.config";

export const DeprecatedButton = styled("button", {
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
  minWidth: 0,

  // Custom
  height: theme.spacing[11],
  px: theme.spacing[5],
  fontFamily: theme.fonts.sans,
  fontSize: theme.fontSize[3],
  fontWeight: 500,
  fontVariantNumeric: "tabular-nums",

  "&:disabled": {
    backgroundColor: theme.colors.slate2,
    boxShadow: `inset 0 0 0 1px ${theme.colors.slate7}`,
    color: theme.colors.slate8,
    pointerEvents: "none",
  },

  variants: {
    size: {
      "1": {
        borderRadius: theme.borderRadius[4],
        height: theme.spacing[11],
        px: theme.spacing[4],
        fontSize: theme.fontSize[3],
      },
      "2": {
        borderRadius: theme.borderRadius[6],
        height: theme.spacing[12],
        px: theme.spacing[9],
        fontSize: theme.fontSize[4],
      },
      "3": {
        borderRadius: theme.borderRadius[6],
        height: theme.spacing[17],
        px: theme.spacing[10],
        fontSize: theme.fontSize[4],
      },
    },
    variant: {
      gray: {
        backgroundColor: theme.colors.loContrast,
        boxShadow: `inset 0 0 0 1px ${theme.colors.slate7}`,
        color: theme.colors.hiContrast,
        "@hover": {
          "&:hover": {
            boxShadow: `inset 0 0 0 1px ${theme.colors.slate8}`,
          },
        },
        "&:active": {
          backgroundColor: theme.colors.slate2,
          boxShadow: `inset 0 0 0 1px ${theme.colors.slate8}`,
        },
        "&:focus": {
          boxShadow: `inset 0 0 0 1px ${theme.colors.slate8}, 0 0 0 1px ${theme.colors.slate8}`,
        },
        '&[data-state="open"]': {
          backgroundColor: theme.colors.slate4,
          boxShadow: `inset 0 0 0 1px ${theme.colors.slate8}`,
        },
      },
      blue: {
        backgroundColor: theme.colors.blue10,
        color: "white",
        "@hover": {
          "&:hover": {
            backgroundColor: theme.colors.loContrast,
            color: theme.colors.blue10,
            boxShadow: `inset 0 0 0 1.5px ${theme.colors.blue10}`,
          },
        },
        "&:active": {
          boxShadow: `inset 0 0 0 1.5px ${theme.colors.blue8}`,
        },
        "&:focus": {
          boxShadow: `inset 0 0 0 1.5px ${theme.colors.blue8}, 0 0 0 1.5px ${theme.colors.blue8}`,
        },
        '&[data-state="open"]': {
          boxShadow: `inset 0 0 0 1.5px ${theme.colors.blue8}`,
        },
      },
      green: {
        backgroundColor: theme.colors.green2,
        boxShadow: `inset 0 0 0 1px ${theme.colors.green7}`,
        color: theme.colors.green11,
        "@hover": {
          "&:hover": {
            boxShadow: `inset 0 0 0 1px ${theme.colors.green8}`,
          },
        },
        "&:active": {
          backgroundColor: theme.colors.green3,
          boxShadow: `inset 0 0 0 1px ${theme.colors.green8}`,
        },
        "&:focus": {
          boxShadow: `inset 0 0 0 1px ${theme.colors.green8}, 0 0 0 1px ${theme.colors.green8}`,
        },
        '&[data-state="open"]': {
          backgroundColor: theme.colors.green4,
          boxShadow: `inset 0 0 0 1px ${theme.colors.green8}`,
        },
      },
      red: {
        backgroundColor: theme.colors.loContrast,
        boxShadow: `inset 0 0 0 1px ${theme.colors.red10}`,
        color: theme.colors.red10,
        "@hover": {
          "&:hover": {
            background: theme.colors.red10,
            color: theme.colors.loContrast,
          },
        },
        "&:active": {
          backgroundColor: theme.colors.red11,
          color: theme.colors.loContrast,
        },
        "&:focus": {
          boxShadow: `inset 0 0 0 1px ${theme.colors.red8}, 0 0 0 1px ${theme.colors.red8}`,
        },
        '&[data-state="open"]': {
          backgroundColor: theme.colors.red4,
          boxShadow: `inset 0 0 0 1px ${theme.colors.red8}`,
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
        backgroundColor: theme.colors.slate4,
        boxShadow: `inset 0 0 0 1px ${theme.colors.slate8}`,
        color: theme.colors.slate11,
        "@hover": {
          "&:hover": {
            backgroundColor: theme.colors.slate6,
            boxShadow: `inset 0 0 0 1px ${theme.colors.slate8}`,
          },
        },
        "&:active": {
          backgroundColor: theme.colors.slate6,
        },
        "&:focus": {
          boxShadow: `inset 0 0 0 1px ${theme.colors.slate8}, 0 0 0 1px ${theme.colors.slate8}`,
        },
      },
      waiting: {
        backgroundColor: theme.colors.slate4,
        boxShadow: `inset 0 0 0 1px ${theme.colors.slate8}`,
        color: theme.colors.slate9,
        cursor: "wait",
        "&:hover, &:active": {
          color: theme.colors.slate9,
        },
        "&:focus": {
          boxShadow: `inset 0 0 0 1px ${theme.colors.slate8}`,
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
        color: theme.colors.hiContrast,
        "@hover": {
          "&:hover": {
            backgroundColor: theme.colors.slateA3,
            boxShadow: "none",
          },
        },
        "&:active": {
          backgroundColor: theme.colors.slateA4,
        },
        "&:focus": {
          boxShadow: `inset 0 0 0 1px ${theme.colors.slateA8}, 0 0 0 1px ${theme.colors.slateA8}`,
        },
        '&[data-state="open"]': {
          backgroundColor: theme.colors.slateA4,
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
            backgroundColor: theme.colors.blueA3,
            boxShadow: "none",
          },
        },
        "&:active": {
          backgroundColor: theme.colors.blueA4,
        },
        "&:focus": {
          boxShadow: `0px 0px 0px 2px ${theme.colors.blue10}, 0px 0px 0px 2px ${theme.colors.blue10}`,
        },
        '&[data-state="open"]': {
          backgroundColor: theme.colors.blueA4,
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
            backgroundColor: theme.colors.greenA3,
            boxShadow: "none",
          },
        },
        "&:active": {
          backgroundColor: theme.colors.greenA4,
        },
        "&:focus": {
          boxShadow: `inset 0 0 0 1px ${theme.colors.greenA8}, 0 0 0 1px ${theme.colors.greenA8}`,
        },
        '&[data-state="open"]': {
          backgroundColor: theme.colors.greenA4,
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
            backgroundColor: theme.colors.redA3,
            boxShadow: "none",
          },
        },
        "&:active": {
          backgroundColor: theme.colors.redA4,
        },
        "&:focus": {
          boxShadow: `inset 0 0 0 1px ${theme.colors.redA8}, 0 0 0 1px ${theme.colors.redA8}`,
        },
        '&[data-state="open"]': {
          backgroundColor: theme.colors.redA4,
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
