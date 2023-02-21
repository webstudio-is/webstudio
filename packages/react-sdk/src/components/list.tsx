import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";

const unorderedTag = "ul";
const orderedTag = "ol";

type Props = ComponentProps<typeof unorderedTag> &
  ComponentProps<typeof orderedTag> & {
    ordered?: boolean;
  };

export const List = forwardRef<
  ElementRef<typeof unorderedTag | typeof orderedTag>,
  Props
>(({ ordered = false, ...props }, ref) => {
  const tag = ordered ? orderedTag : unorderedTag;
  return createElement(tag, { ...props, ref });
});

List.displayName = "List";
