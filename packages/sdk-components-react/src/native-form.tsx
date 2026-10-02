import { forwardRef, type ComponentProps, type ElementRef } from "react";

export const defaultTag = "form";

export const NativeForm = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>(({ children, ...props }, ref) => (
  <form {...props} ref={ref}>
    {children}
  </form>
));

NativeForm.displayName = "NativeForm";
