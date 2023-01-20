import { Box, theme, css } from "@webstudio-is/design-system";
import { ComponentProps } from "react";

const variantTagMap = {
  large: "h1",
  small: "h2",
  tiny: "h3",
} as const;

const headingStyle = css({
  // @todo use theme
  fontFamily: "ManropeVariable, sans-serif",
  lineHeight: 1,
  margin: 0,
  variants: {
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

type HeadingProps = ComponentProps<typeof Box> & {
  variant: "large" | "small" | "tiny";
};

// @todo decide if this should be in design system
export const Heading = (props: HeadingProps) => {
  return (
    <Box
      as={variantTagMap[props.variant]}
      className={headingStyle(props)}
      {...props}
    />
  );
};
