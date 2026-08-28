import { css, styled } from "../stitches.config";
import { truncate } from "../utilities";
import { typography } from "../design-tokens";
import { cssVar } from "../css-var";

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
      main: { color: cssVar("--foreground-primary") },
      contrast: { color: cssVar("--foreground-on-inverse") },
      subtle: { color: cssVar("--foreground-secondary") },
      moreSubtle: { color: cssVar("--foreground-muted") },
      disabled: { color: cssVar("--foreground-disabled") },
      success: { color: cssVar("--foreground-positive") },
      destructive: {
        color: cssVar("--foreground-negative"),
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
      },
    },
    userSelect: {
      text: {
        userSelect: "text",
      },
      none: {
        userSelect: "none",
      },
    },
    inline: {
      true: {
        display: "inline",
      },
    },
  },
  defaultVariants: { variant: "regular" },
});

export const Text = styled("div", textStyle);
