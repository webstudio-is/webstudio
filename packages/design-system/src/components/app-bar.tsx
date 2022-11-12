import { styled } from "../stitches.config";

export const AppBar = styled("div", {
  boxSizing: "border-box",
  zIndex: "1",

  variants: {
    size: {
      1: {
        py: "$spacing$3",
      },
      2: {
        py: "$spacing$5",
      },
      3: {
        py: "$spacing$9",
      },
    },
    sticky: {
      true: {
        position: "sticky",
        width: "100%",
        top: 0,
        left: 0,
      },
    },
    glass: {
      true: {
        backdropFilter: "blur(12px) saturate(160%)",
      },
    },
    border: {
      true: {
        borderBottom: "$spacing$1 solid",
      },
    },
    color: {
      loContrast: {
        backgroundColor: "$loContrast",
      },
      plain: {
        backgroundColor: "$gray2",
      },
      accent: {
        backgroundColor: "$blue9",
      },
    },
  },
  compoundVariants: [
    {
      glass: "true",
      color: "plain",
      css: {
        opacity: ".9",
      },
    },
    {
      glass: "true",
      color: "accent",
      css: {
        opacity: ".9",
      },
    },
    {
      glass: "true",
      color: "loContrast",
      css: {
        opacity: ".9",
      },
    },
    {
      border: "true",
      color: "plain",
      css: {
        borderColor: "$slate6",
      },
    },
    {
      border: "true",
      color: "accent",
      css: {
        borderColor: "$blue11",
      },
    },
    {
      border: "true",
      color: "loContrast",
      css: {
        borderColor: "$slate6",
      },
    },
  ],
  defaultVariants: {
    size: "1",
    color: "loContrast",
  },
});
