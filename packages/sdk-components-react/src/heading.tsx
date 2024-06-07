import { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "h1";

type Props = ComponentProps<typeof defaultTag> & {
  /** Use HTML heading levels (h1-h6) to structure content hierarchically, with h1 as the main title and subsequent levels representing sub-sections. Maintain a logical order and avoid skipping levels to ensure consistent and meaningful organization. */
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
};

export const Heading = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ tag = defaultTag, children, ...props }, ref) => {
    // Can't map it in the destricturing, default type won't be generated correctly
    const Tag = tag;
    return (
      <Tag {...props} ref={ref}>
        {children}
      </Tag>
    );
  }
);

Heading.displayName = "Heading";
