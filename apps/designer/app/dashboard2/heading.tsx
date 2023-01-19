import { Box, theme } from "@webstudio-is/design-system";
import { ComponentProps } from "react";

const variantTagMap = {
  large: "h1",
  small: "h2",
  tiny: "h3",
} as const;

const variantCssMap = {
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
} as const;

type HeadingProps = ComponentProps<typeof Box> & {
  variant: "large" | "small" | "tiny";
};

// @todo
// - decide if this should be in design system
// - ideally variant should render the right tag instead of using "as"
export const Heading = (props: HeadingProps) => {
  return (
    <Box
      as={variantTagMap[props.variant]}
      css={{
        // @todo use theme
        fontFamily: "ManropeVariable, sans-serif",
        lineHeight: 1,
        margin: 0,
        ...variantCssMap[props.variant],
      }}
      {...props}
    />
  );
};
