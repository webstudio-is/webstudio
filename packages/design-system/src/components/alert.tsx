import { styled } from "../stitches.config";

export const Alert = styled("div", {
  // Reset
  boxSizing: "border-box",
  "&::before": {
    boxSizing: "border-box",
  },
  "&::after": {
    boxSizing: "border-box",
  },

  border: "1px solid",
  borderRadius: "$2",

  variants: {
    size: {
      "1": {
        p: "$3",
      },
    },
    variant: {
      loContrast: {
        backgroundColor: "$loContrast",
        borderColor: "$slate6",
      },
      gray: {
        backgroundColor: "$slate2",
        borderColor: "$slate6",
      },
      blue: {
        backgroundColor: "$blue2",
        borderColor: "$blue6",
      },
      green: {
        backgroundColor: "$green2",
        borderColor: "$green6",
      },
      red: {
        backgroundColor: "$red2",
        borderColor: "$red6",
      },
    },
  },
  defaultVariants: {
    size: "1",
    variant: "gray",
  },
});
