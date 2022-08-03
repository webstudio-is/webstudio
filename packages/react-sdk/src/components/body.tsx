import {
  createElement,
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useEffect,
} from "react";

const defaultTag = "body";

export const Body = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => <body {...props} ref={ref} />);

Body.displayName = "Body";
