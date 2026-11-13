import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "form";

/** @deprecated Use an Element with tag `form` for native browser behavior. */
export const Form = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>(({ children, ...props }, ref) => (
  <form {...props} ref={ref}>
    {children}
  </form>
));

Form.displayName = "Form";
