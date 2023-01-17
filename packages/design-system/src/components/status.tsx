import { styled } from "../stitches.config";
import { theme } from "../stitches.config";

export const Status = styled("div", {
  borderRadius: "50%",
  flexShrink: 0,

  variants: {
    size: {
      "1": {
        width: 5,
        height: 5,
      },
      "2": {
        width: 9,
        height: 9,
      },
    },
    variant: {
      gray: {
        backgroundColor: theme.colors.slate7,
      },
      blue: {
        backgroundColor: theme.colors.blue9,
      },
      green: {
        backgroundColor: theme.colors.green9,
      },
      yellow: {
        backgroundColor: theme.colors.yellow9,
      },
      red: {
        backgroundColor: theme.colors.red9,
      },
    },
  },
  defaultVariants: {
    size: "2",
    variant: "gray",
  },
});
