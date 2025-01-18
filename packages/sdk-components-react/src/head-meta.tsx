import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
} from "react";
import { XmlNode } from "./xml-node";

export const defaultTag = "meta";

const PROPS_ORDER = ["property", "name", "content"] as const;

export const HeadMeta = forwardRef<
  ElementRef<"div">,
  ComponentProps<typeof defaultTag>
>(({ ...props }, ref) => {
  const { renderer } = useContext(ReactSdkContext);

  const propsSet = new Set([...PROPS_ORDER, ...Object.keys(props)]) as Set<
    keyof typeof props
  >;

  const cleanOrderedProps: Record<string, unknown> = {};

  for (const prop of propsSet) {
    // Boolean check is not a mistake; it excludes empty values.
    // Empty properties must be excluded because there is no UI to reset them to undefined.
    // Additionally, <meta property="" name="someName" content="someContent" /> is invalid.
    if (prop in props && Boolean(props[prop])) {
      cleanOrderedProps[prop] = props[prop];
    }
  }

  if (renderer === undefined) {
    return <meta {...cleanOrderedProps} />;
  }

  return <XmlNode tag={defaultTag} {...cleanOrderedProps} ref={ref} />;
});

HeadMeta.displayName = "HeadMeta";
