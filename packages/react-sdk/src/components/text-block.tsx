import {
  createElement,
  forwardRef,
  type ElementRef,
  type ComponentProps,
} from "react";

export const defaultTag = "div";

// We don't want to enable all tags because Box is usually a container and we have specific components for many tags.
type Props = ComponentProps<typeof defaultTag> & {
  tag?: "div" | "figcaption";
};

export const TextBlock = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ tag = defaultTag, ...props }, ref) => {
    return createElement(tag as string, { ...props, ref });
  }
);
