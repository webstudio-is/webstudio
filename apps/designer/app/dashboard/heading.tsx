import { Box, theme, css } from "@webstudio-is/design-system";
import { ComponentProps } from "react";

const variantTagMap = {
  large: "h1",
  small: "h2",
  tiny: "h3",
} as const;

const headingStyle = css({
  fontFamily: theme.fonts.manrope,
  lineHeight: 1,
  margin: 0,
  variants: {
    variant: {
      large: {
        fontSize: 48,
        fontWeight: 700,
      },
      small: {
        fontSize: theme.deprecatedFontSize[5],
        fontWeight: 700,
      },
      tiny: {
        fontSize: theme.deprecatedFontSize[5],
        fontWeight: 400,
      },
    },
  },
});

type HeadingProps = ComponentProps<typeof Box> & {
  variant: "large" | "small" | "tiny";
};

// @todo this thing should be gone and we would just use text component or styles from text component
export const Heading = (props: HeadingProps) => {
  return (
    <Box
      as={variantTagMap[props.variant]}
      className={headingStyle(props)}
      {...props}
    />
  );
};
