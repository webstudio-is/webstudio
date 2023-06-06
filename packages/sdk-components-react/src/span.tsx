import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "span";

export const Span = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <span {...props} ref={ref} />);

Span.displayName = "Span";
