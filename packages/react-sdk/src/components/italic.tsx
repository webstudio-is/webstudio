import { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "i";

export const Italic = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <i {...props} ref={ref} />);

Italic.displayName = "Italic";
