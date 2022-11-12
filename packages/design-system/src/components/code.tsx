import { styled } from "../stitches.config";

export const Code = styled("code", {
  fontFamily: "$mono",
  fontSize: "max(12px, 85%)",
  whiteSpace: "nowrap",
  padding: "0 $spacing$2 $spacing$2 $spacing$2",

  variants: {
    variant: {
      gray: {
        backgroundColor: "$slate3",
        color: "$slate11",
      },
      violet: {
        backgroundColor: "$violet3",
        color: "$violet11",
      },
    },
  },
  defaultVariants: {
    variant: "violet",
  },
});
