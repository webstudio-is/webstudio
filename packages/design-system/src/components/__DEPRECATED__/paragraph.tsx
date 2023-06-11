import { type ComponentProps, type ElementRef, forwardRef } from "react";
import { DeprecatedText2 } from "./text2";

const DEFAULT_TAG = "p";

type ParagraphProps = ComponentProps<typeof DEFAULT_TAG> &
  ComponentProps<typeof DeprecatedText2>;

export const DeprecatedParagraph = forwardRef<
  ElementRef<typeof DEFAULT_TAG>,
  ParagraphProps
>(({ css, ...props }, forwardedRef) => {
  return (
    <DeprecatedText2
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

DeprecatedParagraph.displayName = "DeprecatedParagraph";
