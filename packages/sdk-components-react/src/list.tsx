import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";
import type { keywordValues } from "@webstudio-is/css-data";

const unorderedTag = "ul";
const orderedTag = "ol";

export type ListTag = typeof unorderedTag | typeof orderedTag;

type ListStyleType = (typeof keywordValues)["listStyleType"];

type Props = ComponentProps<typeof unorderedTag> &
  ComponentProps<typeof orderedTag> & {
    ordered?: boolean;
    listStyleType?: ListStyleType;
  };

export const List = forwardRef<
  ElementRef<typeof unorderedTag | typeof orderedTag>,
  Props
>(({ ordered = false, listStyleType = "disk", ...props }, ref) => {
  const tag = ordered ? orderedTag : unorderedTag;
  return createElement(tag, {
    ...props,
    ["data-style-type"]: listStyleType,
    ref,
  });
});

List.displayName = "List";
