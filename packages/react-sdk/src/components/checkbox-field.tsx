import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "label";

export const CheckboxField = forwardRef<
  ElementRef<typeof defaultTag>,
  Omit<ComponentProps<typeof defaultTag>, "htmlFor">
>((props, ref) => <label {...props} ref={ref} />);

CheckboxField.displayName = "CheckboxField";
