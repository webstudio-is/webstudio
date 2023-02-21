import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";

const defaultTag = "ul";

type Props = ComponentProps<typeof defaultTag>;

export const List = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    return createElement(defaultTag, { ...props, ref });
  }
);

List.displayName = "List";
