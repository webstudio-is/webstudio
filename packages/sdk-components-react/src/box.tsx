import {
  createElement,
  forwardRef,
  type ElementRef,
  type ComponentProps,
} from "react";

const defaultTag = "div";

// We don't want to enable all tags because Box is usually a container and we have specific components for many tags.
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
    return createElement(tag, { ...props, ref });
  }
);

Box.displayName = "Box";
