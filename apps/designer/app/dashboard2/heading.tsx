import { styled, theme } from "@webstudio-is/design-system";

export const Heading = styled("h1", {
  // @todo use theme
  fontFamily: "ManropeVariable, sans-serif",
  lineHeight: 1,
  margin: 0,
  variants: {
    // @todo align names with figma
    variant: {
      large: {
        // @todo use theme and ask Mark to add it to tokens
        fontSize: 48,
        fontWeight: 700,
      },
      small: {
        fontSize: theme.fontSize[5],
        fontWeight: 700,
      },
      tiny: {
        fontSize: theme.fontSize[5],
        fontWeight: 400,
      },
    },
  },
});
