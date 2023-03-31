import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "div";

export const TextBlock = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <div {...props} ref={ref} />);

TextBlock.displayName = "TextBlock";
