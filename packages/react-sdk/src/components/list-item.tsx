import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";

export const defaultTag = "li";

type Props = ComponentProps<typeof defaultTag>;

export const ListItem = forwardRef<ElementRef<typeof defaultTag>, Props>(
  (props, ref) => {
    return createElement(defaultTag, { ...props, ref });
  }
);

ListItem.displayName = "ListItem";
