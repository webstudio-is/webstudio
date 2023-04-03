import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";

export const defaultTag = "hr";

type Props = ComponentProps<typeof defaultTag>;

export const Separator = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    return createElement(defaultTag, { ...props, ref });
  }
);

Separator.displayName = "Separator";
