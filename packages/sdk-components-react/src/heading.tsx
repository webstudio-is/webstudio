import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  createElement,
} from "react";
import { getTagFromProps } from "@webstudio-is/sdk/runtime";

const defaultTag = "h1";

type Props = ComponentProps<typeof defaultTag> & {
  tag?: string;
};

export const Heading = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ tag: legacyTag, ...props }, ref) => {
    const tag = getTagFromProps(props) ?? legacyTag ?? defaultTag;
    return createElement(tag, { ...props, ref });
  }
);

Heading.displayName = "Heading";
