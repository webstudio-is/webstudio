import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";
import { getTagFromProps } from "@webstudio-is/sdk/runtime";

const defaultTag = "div";

type Props = ComponentProps<typeof defaultTag> & {
  tag?: string;
};

export const Text = forwardRef<ElementRef<typeof defaultTag>, Props>(
  ({ tag: legacyTag, ...props }, ref) => {
    const tag = getTagFromProps(props) ?? legacyTag ?? defaultTag;
    return createElement(tag, { ...props, ref });
  }
);

Text.displayName = "Text";
