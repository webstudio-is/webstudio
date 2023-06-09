import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "span";

export const SpanContainer = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <span {...props} ref={ref} />);

SpanContainer.displayName = "SpanContainer";
