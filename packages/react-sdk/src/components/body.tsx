import {
  createElement,
  forwardRef,
  type ElementRef,
  type ComponentProps,
} from "react";

const defaultTag = "body";

export const Body = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => createElement(defaultTag, { ...props, ref }));

Body.displayName = "Body";
