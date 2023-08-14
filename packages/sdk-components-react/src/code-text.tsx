import {
  type ElementRef,
  type ComponentProps,
  forwardRef,
  createElement,
} from "react";

export const defaultTag = "code";

type Props = ComponentProps<typeof defaultTag> & {
  "data-inline"?: boolean;
  "data-meta"?: string;
};

export const CodeText = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    return createElement(defaultTag, { ...props, ref });
  }
);

CodeText.displayName = "CodeText";
