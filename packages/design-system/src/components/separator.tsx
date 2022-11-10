import { styled } from "../stitches.config";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

export const Separator = styled(SeparatorPrimitive.Root, {
  border: "none",
  margin: 0,
  flexShrink: 0,
  backgroundColor: "$slate7",
  cursor: "default",

  variants: {
    size: {
      "1": {
        '&[data-orientation="horizontal"]': {
          height: "$spacing$1",
          width: "$spacing$9",
        },

        '&[data-orientation="vertical"]': {
          width: "$spacing$1",
          height: "$spacing$9",
        },
      },
      "2": {
        '&[data-orientation="horizontal"]': {
          height: "$spacing$2",
          width: "$spacing$17",
        },

        '&[data-orientation="vertical"]': {
          width: "$spacing$2",
          height: "$spacing$17",
        },
      },
      auto: {
        '&[data-orientation="horizontal"]': {
          height: "$spacing$1",
        },

        '&[data-orientation="vertical"]': {
          width: "$spacing$1",
        },
      },
    },
  },
  defaultVariants: {
    size: "auto",
  },
});
