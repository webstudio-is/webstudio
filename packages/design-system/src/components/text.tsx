import { styled } from "../stitches.config";

/**
 * For use as a standalone, single-line text element. If you need a multiline element - use Paragraph.
 */
export const Text = styled("div", {
  // Reset
  margin: 0,
  lineHeight: 1,
  userSelect: "none",
  fontFamily: "$sans",

  variants: {
    variant: {
      regular: {
        fontWeight: 400,
        fontSize: 12,
        letterSpacing: "0.005em",
      },
      label: {
        fontWeight: 500,
        fontSize: 12,
        letterSpacing: "0.005em",
      },
      tiny: {
        fontWeight: 400,
        fontSize: 8,
        letterSpacing: "0.01em",
      },
      title: {
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: "0.01em",
      },
      mono: {
        fontFamily: "$mono",
        fontWeight: 400,
        fontSize: 12,
        textTransform: "uppercase",
      },
      unit: {
        fontWeight: 500,
        fontSize: 10,
        lineHeight: 12,
        textTransform: "uppercase",
      },
    },
  },

  defaultVariants: {
    variant: "regular",
  },
});
