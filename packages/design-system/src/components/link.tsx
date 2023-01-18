import { styled } from "../stitches.config";
import { DeprecatedText } from "./__DEPRECATED__/text";
import { theme } from "../stitches.config";

export const Link = styled("a", {
  alignItems: "center",
  gap: theme.spacing[3],
  flexShrink: 0,
  outline: "none",
  textDecorationLine: "none",
  textUnderlineOffset: "3px",
  textDecorationColor: theme.colors.slate4,
  WebkitTapHighlightColor: "rgba(0,0,0,0)",
  lineHeight: "inherit",
  "@hover": {
    "&:hover": {
      textDecorationLine: "underline",
    },
  },
  "&:focus": {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineOffset: "2px",
    textDecorationLine: "none",
  },
  [`& ${DeprecatedText}`]: {
    color: "inherit",
  },
  variants: {
    variant: {
      blue: {
        color: theme.colors.blue11,
        textDecorationColor: theme.colors.blue4,
        "&:focus": {
          outlineColor: theme.colors.blue8,
        },
      },
      subtle: {
        color: theme.colors.slate11,
        textDecorationColor: theme.colors.slate4,
        "&:focus": {
          outlineColor: theme.colors.slate8,
        },
      },
      contrast: {
        color: theme.colors.hiContrast,
        textDecoration: "underline",
        textDecorationColor: theme.colors.slate4,
        "@hover": {
          "&:hover": {
            textDecorationColor: theme.colors.slate7,
          },
        },
        "&:focus": {
          outlineColor: theme.colors.slate8,
        },
      },
    },
  },
  defaultVariants: {
    variant: "contrast",
  },
});
