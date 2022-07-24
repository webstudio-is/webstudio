import React, {
  createElement,
  forwardRef,
  type ElementRef,
  type ComponentProps,
} from "react";

const defaultTag = "div";

type Props = ComponentProps<typeof defaultTag> & {
  tag?:
    | "div"
    | "header"
    | "footer"
    | "nav"
    | "main"
    | "section"
    | "article"
    | "aside"
    | "address"
    | "figure";
};

export const Box = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ tag = defaultTag, ...props }, ref) => {
    return createElement(tag as string, { ...props, ref });
  }
);

Box.displayName = "Box";
