import {
  type ElementRef,
  type ComponentProps,
  forwardRef,
  createElement,
} from "react";

export const defaultTag = "code";

export const CodeText = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof defaultTag>
>((props, ref) => {
  return createElement(defaultTag, { ...props, ref });
});

CodeText.displayName = "CodeText";
