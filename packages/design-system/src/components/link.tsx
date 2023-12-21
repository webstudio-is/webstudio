import { css, theme } from "../stitches.config";
import { textVariants } from "./text";

export const linkStyle = css({
  color: theme.colors.foregroundLink,
  "&:hover": { color: theme.colors.foregroundLinkHoverMain },
  "&:visited": {
    color: theme.colors.foregroundLink,
  },
  variants: {
    variant: {
      regular: textVariants.regularLink,
      label: textVariants.labelLink,
      mono: textVariants.monoLink,
    },
    color: {
      contrast: {
        color: theme.colors.foregroundContrastMain,
        "&:hover": { color: theme.colors.foregroundLinkHoverContrast },
      },
      subtle: { color: theme.colors.foregroundLinkHoverTextSubtle },
      moreSubtle: { color: theme.colors.foregroundLinkHoverTextMoreSubtle },
    },
  },
  defaultVariants: {
    variant: "regular",
  },
});
