import { styled } from "../stitches.config";

export const Banner = styled("div", {
  // Reset
  boxSizing: "border-box",
  "&::before": {
    boxSizing: "border-box",
  },
  "&::after": {
    boxSizing: "border-box",
  },

  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "$spacing$9",

  variants: {
    size: {
      "1": {
        py: "$spacing$3",
        px: "$spacing$10",
      },
    },
    variant: {
      loContrast: {
        backgroundColor: "$loContrast",
      },
      gray: {
        backgroundColor: "$slate3",
      },
      blue: {
        backgroundColor: "$blue3",
      },
      green: {
        backgroundColor: "$green3",
      },
      red: {
        backgroundColor: "$red3",
      },
    },
    rounded: {
      true: {
        borderRadius: "$borderRadius$pill",
      },
    },
    border: {
      true: {
        borderRadius: "$borderRadius$pill",
      },
    },
  },
  compoundVariants: [
    {
      border: "true",
      variant: "gray",
      css: {
        borderColor: "$slate6",
      },
    },
    {
      border: "true",
      variant: "blue",
      css: {
        borderColor: "$blue11",
      },
    },
    {
      border: "true",
      variant: "loContrast",
      css: {
        borderColor: "$slate6",
      },
    },
  ],
  defaultVariants: {
    size: "1",
    variant: "gray",
  },
});
