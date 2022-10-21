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
  gap: "$3",

  variants: {
    size: {
      "1": {
        py: "$1",
        px: "$4",
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
        borderRadius: "$pill",
      },
    },
    border: {
      true: {
        borderRadius: "$pill",
      },
    },
  },
  compoundVariants: [
    {
      border: "true",
      variant: "gray",
      css: {
        borderColor: "$muted",
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
        borderColor: "$muted",
      },
    },
  ],
  defaultVariants: {
    size: "1",
    variant: "gray",
  },
});
