import { styled } from "../stitches.config";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { theme } from "../stitches.config";

export const Separator = styled(SeparatorPrimitive.Root, {
  border: "none",
  margin: 0,
  flexShrink: 0,
  backgroundColor: theme.colors.slate7,
  cursor: "default",

  variants: {
    size: {
      "1": {
        '&[data-orientation="horizontal"]': {
          height: theme.spacing[1],
          width: theme.spacing[9],
        },

        '&[data-orientation="vertical"]': {
          width: theme.spacing[1],
          height: theme.spacing[9],
        },
      },
      "2": {
        '&[data-orientation="horizontal"]': {
          height: theme.spacing[2],
          width: theme.spacing[17],
        },

        '&[data-orientation="vertical"]': {
          width: theme.spacing[2],
          height: theme.spacing[17],
        },
      },
      auto: {
        '&[data-orientation="horizontal"]': {
          height: theme.spacing[1],
        },

        '&[data-orientation="vertical"]': {
          width: theme.spacing[1],
        },
      },
    },
  },
  defaultVariants: {
    size: "auto",
  },
});
