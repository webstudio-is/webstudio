import { styled } from "../stitches.config";

export const Section = styled("section", {
  // Reset
  boxSizing: "border-box",
  flexShrink: 0,
  "&::before": {
    boxSizing: "border-box",
    content: '""',
  },
  "&::after": {
    boxSizing: "border-box",
    content: '""',
  },

  variants: {
    size: {
      "1": {
        py: "$spacing$9",
      },
      "2": {
        py: "$spacing$11",
      },
      "3": {
        py: "$spacing$20",
      },
    },
  },
  defaultVariants: {
    size: "3",
  },
});
