import { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "sub";

export const Subscript = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <sub {...props} ref={ref} />);

Subscript.displayName = "Subscript";
