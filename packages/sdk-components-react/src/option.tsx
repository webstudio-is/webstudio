import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "option";

export const Option = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <option {...props} ref={ref} />);

Option.displayName = "Option";
