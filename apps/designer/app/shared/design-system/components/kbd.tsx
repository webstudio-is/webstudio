import { styled } from "../stitches.config";

export const Kbd = styled("kbd", {
  boxSizing: "border-box",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "$loContrast",
  flexShrink: 0,
  color: "$hiContrast",
  userSelect: "none",
  cursor: "default",
  whiteSpace: "nowrap",
  boxShadow: `
    inset 0 0.5px rgba(255, 255, 255, 0.1),
    inset 0 1px 5px $colors$slate2,
    0px 0px 0px 0.5px $colors$slate8,
    0px 2px 1px -1px $colors$slate8,
    0 1px $colors$slate8`,
  textShadow: "0 0 1px rgba(255, 255, 255, 0.5)",
  fontFamily: "inherit",
  fontWeight: 400,
  lineHeight: "1.5",
  mx: "2px",

  variants: {
    size: {
      "1": {
        borderRadius: "$1",
        px: "0.3em",
        height: "$3",
        minWidth: "1.6em",
        fontSize: "$1",
        lineHeight: "$spaces$3",
      },
      "2": {
        borderRadius: "$2",
        px: "0.5em",
        height: "$5",
        minWidth: "2em",
        fontSize: "$2",
        lineHeight: "$spaces$5",
      },
    },
    width: {
      shift: {
        width: "4em",
        justifyContent: "flex-start",
      },
      command: {
        width: "3em",
        justifyContent: "flex-end",
      },
      space: {
        width: "8em",
      },
    },
  },

  compoundVariants: [
    {
      size: "1",
      width: "shift",
      css: {
        width: "3em",
      },
    },
    {
      size: "1",
      width: "command",
      css: {
        width: "2.5em",
      },
    },
    {
      size: "1",
      width: "space",
      css: {
        width: "5em",
      },
    },
  ],

  defaultVariants: {
    size: "2",
  },
});
