import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";

const defaultTag = "code";

type Props = ComponentProps<typeof defaultTag>;

export const Code = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    return createElement(defaultTag, { ...props, ref });
  }
);

Code.displayName = "Code";
