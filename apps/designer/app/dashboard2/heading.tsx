import { styled, theme } from "@webstudio-is/design-system";

export const Heading = styled("h1", {
  // @todo use theme
  fontFamily: "Manrope, sans-serif",
  color: theme.colors.foregroundContrastMain,
  lineHeight: 1,
  margin: 0,
  variants: {
    // @todo align names with figma
    variant: {
      large: {
        // @todo use theme and ask Mark to add it to tokens
        fontSize: 48,
      },
      small: {
        fontSize: theme.fontSize[5],
      },
    },
  },
});
