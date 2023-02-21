import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";

const defaultTag = "blockquote";

type Props = ComponentProps<typeof defaultTag>;

export const Blockquote = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    return createElement(defaultTag, { ...props, ref });
  }
);

Blockquote.displayName = "Blockquote";
