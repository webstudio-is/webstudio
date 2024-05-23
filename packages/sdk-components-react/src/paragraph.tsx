import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "p";

export const Paragraph = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>(({ children, ...props }, ref) => (
  <p {...props} ref={ref}>
    {children}
  </p>
));

Paragraph.displayName = "Paragraph";
