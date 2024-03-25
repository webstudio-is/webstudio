import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "input";

export const Checkbox = forwardRef<
  ElementRef<typeof defaultTag>,
  Omit<ComponentProps<typeof defaultTag>, "type" | "value"> & { value?: string }
  // Make sure children are not passed down to an input, because this will result in error.
>(({ children: _children, ...props }, ref) => {
  return <input {...props} type="checkbox" ref={ref} />;
});

Checkbox.displayName = "Checkbox";
