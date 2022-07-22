import React, {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";

const defaultTag = "h1";

type Props = ComponentProps<typeof defaultTag> & {
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
};

export const Heading = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ tag, ...props }, ref) => {
    return createElement(tag as string, { ...props, ref });
  }
);

Heading.defaultProps = {
  tag: "h1",
};

Heading.displayName = "Heading";
