import { forwardRef, type ElementRef, type ComponentProps } from "react";

const defaultTag = "sup";

export const Superscript = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <sup {...props} ref={ref} />);

Superscript.displayName = "Bold";
