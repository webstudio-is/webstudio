import { styled, theme } from "../stitches.config";
import { textVariants } from "./text";

export const Link = styled("a", {
  cursor: "pointer",
  variants: {
    variant: {
      inherit: {
        fontFamily: "inherit",
        fontWeight: "inherit",
        fontSize: "inherit",
        lineHeight: "inherit",
        letterSpacing: "inherit",
        textTransform: "inherit",
        textIndent: "inherit",
        textDecoration: "underline",
      },
      regular: textVariants.regularLink,
      label: textVariants.labelLink,
      mono: textVariants.monoLink,
      monoBold: textVariants.monoBoldLink,
    },
    color: {
      main: {
        color: theme.colors.foregroundMain,
        "&:hover, &:visited": { color: theme.colors.foregroundMain },
      },
      contrast: {
        color: theme.colors.foregroundContrastMain,
        "&:hover, &:visited": { color: theme.colors.foregroundContrastMain },
      },
      subtle: {
        color: theme.colors.foregroundTextSubtle,
        "&:hover, &:visited": { color: theme.colors.foregroundTextSubtle },
      },
      moreSubtle: {
        color: theme.colors.foregroundTextMoreSubtle,
        "&:hover, &:visited": { color: theme.colors.foregroundTextMoreSubtle },
      },
      inherit: {
        color: "inherit",
        "&:hover, &:visited": { color: "inherit" },
      },
    },
    underline: {
      none: {
        textDecoration: "none",
        "&:hover": { textDecoration: "none" },
      },
      hover: {
        textDecoration: "none",
        "&:hover": { textDecoration: "underline" },
      },
      always: {
        textDecoration: "underline",
        "&:hover": { textDecoration: "underline" },
      },
    },
  },
  defaultVariants: {
    variant: "regular",
    color: "main",
    underline: "hover",
  },
});
