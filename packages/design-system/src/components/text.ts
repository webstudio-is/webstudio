import { css, theme, styled } from "../stitches.config";
import { truncate } from "../utilities";
import { typography } from "../__generated__/figma-design-tokens";

const normalize = {
  userSelect: "none",
} as const;

type Variant = keyof typeof typography;
type VariantStyle = typeof normalize & (typeof typography)[Variant];

export const textVariants = {} as { [Key in Variant]: VariantStyle };

let variant: Variant;
for (variant in typography) {
  textVariants[variant] = {
    ...typography[variant as Variant],
    ...normalize,
  };
}

export const textStyle = css({
  margin: 0, // in case it's used with <p>
  WebkitFontSmoothing: "antialiased",
  variants: {
    variant: textVariants,
    color: {
      main: { color: theme.colors.foregroundMain },
      contrast: { color: theme.colors.foregroundContrastMain },
      subtle: { color: theme.colors.foregroundSubtle },
      moreSubtle: { color: theme.colors.foregroundTextMoreSubtle },
      disabled: { color: theme.colors.foregroundDisabled },
      success: { color: theme.colors.foregroundSuccessText },
      destructive: {
        color: theme.colors.foregroundDestructive,
        // destructive in most cases used to show 3rd party errors
        // we don't want it to break layout
        overflowWrap: "anywhere",
        userSelect: "auto",
      },
    },
    align: {
      left: { textAlign: "left" },
      center: { textAlign: "center" },
      right: { textAlign: "right" },
    },
    truncate: {
      true: {
        ...truncate(),

        // To make sure text is not clipped vertically
        pt: "0.5em",
        pb: "0.5em",
        mt: "-0.5em",
        mb: "-0.5em",

        flexBasis: 0,
        flexGrow: 1,
      },
    },
    userSelect: {
      auto: {
        userSelect: "auto",
      },
      none: {
        userSelect: "none",
      },
    },
  },
  defaultVariants: { variant: "regular" },
});

export const Text = styled("div", textStyle);
