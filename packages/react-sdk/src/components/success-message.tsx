import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "div";

export const SuccessMessage = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <div {...props} ref={ref} />);

SuccessMessage.displayName = "SuccessMessage";
