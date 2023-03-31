import { forwardRef, type ElementRef, type ComponentProps } from "react";

export const defaultTag = "body";

export const Body = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <body {...props} ref={ref} />);

Body.displayName = "Body";
