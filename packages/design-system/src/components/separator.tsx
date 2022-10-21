import { styled } from "../stitches.config";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

export const Separator = styled(SeparatorPrimitive.Root, {
  border: "none",
  margin: 0,
  flexShrink: 0,
  backgroundColor: "$muted",
  cursor: "default",

  variants: {
    size: {
      "1": {
        '&[data-orientation="horizontal"]': {
          height: "1px",
          width: "$3",
        },

        '&[data-orientation="vertical"]': {
          width: "1px",
          height: "$3",
        },
      },
      "2": {
        '&[data-orientation="horizontal"]': {
          height: "2px",
          width: "$7",
        },

        '&[data-orientation="vertical"]': {
          width: "2px",
          height: "$7",
        },
      },
      auto: {
        '&[data-orientation="horizontal"]': {
          height: "1px",
        },

        '&[data-orientation="vertical"]': {
          width: "1px",
        },
      },
    },
  },
  defaultVariants: {
    size: "auto",
  },
});
