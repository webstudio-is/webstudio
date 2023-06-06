import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "textarea";

export const Textarea = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
  // Make sure children are not passed down to an textarea, because this will result in error.
>(({ children: _children, ...props }, ref) => (
  <textarea {...props} ref={ref} />
));

Textarea.displayName = "Textarea";
