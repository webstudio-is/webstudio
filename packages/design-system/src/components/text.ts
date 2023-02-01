import { css, theme, styled } from "../stitches.config";
import { typography as textVariants } from "../__generated__/figma-design-tokens";

export { textVariants };

export const textStyles = css({
  variants: {
    variant: textVariants,
    color: {
      subtle: { color: theme.colors.foregroundSubtle },
      destructive: { color: theme.colors.foregroundDestructive },
    },
    align: {
      left: { textAlign: "left" },
      center: { textAlign: "center" },
      right: { textAlign: "right" },
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
      },
    },
  },
  defaultVariants: { variant: "regular" },
});

/**
 * For use as a standalone, single-line text element. If you need a multiline element - use Paragraph.
 */
export const Text = styled("div", textStyles);

export const Paragraph = styled("p", textStyles);
