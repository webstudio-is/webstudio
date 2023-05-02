import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "div";

export const ErrorMessage = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <div {...props} ref={ref} />);

ErrorMessage.displayName = "ErrorMessage";
