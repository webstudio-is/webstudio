import React, { type ComponentProps } from "react";
import { Text } from "./text";

const DEFAULT_TAG = "p";

type ParagraphProps = ComponentProps<typeof DEFAULT_TAG> &
  ComponentProps<typeof Text>;

export const Paragraph = React.forwardRef<
  React.ElementRef<typeof DEFAULT_TAG>,
  ParagraphProps
>(({ css, ...props }, forwardedRef) => {
  return (
    <Text
      as={DEFAULT_TAG}
      {...props}
      ref={forwardedRef}
      css={{
        lineHeight: 1.3,
        ...css,
      }}
    />
  );
});

Paragraph.displayName = "Paragraph";
