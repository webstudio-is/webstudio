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
        fontSize: "$fontSize$3",
        letterSpacing: "0.005em",
      },
      label: {
        fontWeight: 500,
        fontSize: "$fontSize$3",
        letterSpacing: "0.005em",
      },
      tiny: {
        fontWeight: 400,
        fontSize: 8,
        letterSpacing: "0.01em",
      },
      title: {
        fontWeight: 700,
        fontSize: "$fontSize$3",
        letterSpacing: "0.01em",
      },
      mono: {
        fontFamily: "$mono",
        fontWeight: 400,
        fontSize: "$fontSize$3",
        textTransform: "uppercase",
      },
      unit: {
        fontWeight: 500,
        fontSize: 10,
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
      hint: {
        color: "$hint",
      },
      error: {
        color: "$red10",
      },
    },
    align: {
      left: {
        textAlign: "left",
      },
      center: {
        textAlign: "center",
      },
      right: {
        textAlign: "right",
      },
    },
    truncate: {
      true: {
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        overflow: "hidden",

        // To make sure text is not clipped vertically
        pt: "0.5em",
        pb: "0.5em",
        mt: "-0.5em",
        mb: "-0.5em",

        flexBasis: 0,
        flexGrow: 1,

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
