import {
  forwardRef,
  createElement,
  type ElementRef,
  type ComponentProps,
} from "react";

const unorderedTag = "ul";
const orderedTag = "ol";

export type ListTag = typeof unorderedTag | typeof orderedTag;

export const listStyleTypes = [
  "disc",
  "circle",
  "square",
  "decimal",
  "georgian",
  "trad-chinese-informal",
  "kannada",
] as const;

type Props = ComponentProps<typeof unorderedTag> &
  ComponentProps<typeof orderedTag> & {
    ordered?: boolean;
    listStyleType?: (typeof listStyleTypes)[number];
  };

export const List = forwardRef<
  ElementRef<typeof unorderedTag | typeof orderedTag>,
  Props
>(({ ordered = false, listStyleType = "disc", ...props }, ref) => {
  const tag = ordered ? orderedTag : unorderedTag;
  return createElement(tag, {
    ...props,
    ["data-list-style-type"]: listStyleType,
    ref,
  });
});

List.displayName = "List";
