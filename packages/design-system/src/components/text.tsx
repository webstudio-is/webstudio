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
    color: {
      contrast: {
        color: "$hiContrast",
      },
      loContrast: {
        color: "$loContrast",
      },
    },
    truncate: {
      true: {
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        flexBasis: 0,
        flexGrow: 1,

        // We want to use overflow-x:clip to make sure the text is not clipped vertically.
        // overflow:hidden is a fallback for when `clip` is not supported,
        // the text may be clipped vertically in these browsers.
        overflow: "hidden",
        overflowX: "clip",
        overflowY: "visible",

        // For some reason flexBasis:0 is not enough
        // to stop it from growing past the container
        width: 0,
      },
    },
  },

  defaultVariants: {
    variant: "regular",
  },
});
