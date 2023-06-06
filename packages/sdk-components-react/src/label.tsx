import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "label";

export const Label = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <label {...props} ref={ref} />);

Label.displayName = "Label";
