import {
  createElement,
  forwardRef,
  type ElementRef,
  type ComponentProps,
} from "react";

export const defaultTag = "div";

// We don't want to enable all tags because Box is usually a container and we have specific components for many tags.
type Props = ComponentProps<typeof defaultTag> & {
  /** Use this property to change the HTML tag of this element to semantically structure and describe the content of a webpage. This can be important for accessibility tools and search engine optimization. */
  tag?: "div" | "span" | "figcaption" | "cite";
};

export const Text = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ tag = defaultTag, ...props }, ref) => {
    return createElement(tag, { ...props, ref });
  }
);

Text.displayName = "Text";
