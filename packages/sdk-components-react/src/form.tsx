import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "form";

export const Form = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>(({ children, ...props }, ref) => (
  <form {...props} ref={ref}>
    {children}
  </form>
));

Form.displayName = "Form";
