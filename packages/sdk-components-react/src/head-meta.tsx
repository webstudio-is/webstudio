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
    if (prop in props && props[prop] !== undefined) {
      cleanOrderedProps[prop] = props[prop];
    }
  }

  if (renderer === undefined) {
    return <meta {...cleanOrderedProps} />;
  }

  // HTML attributes are case-insensitive, but the convention is to use lowercase
  const htmlAttributes = Object.fromEntries(
    Object.entries(cleanOrderedProps).map(([key, value]) => [
      key?.toLowerCase(),
      value,
    ])
  );

  return <XmlNode tag={defaultTag} {...htmlAttributes} ref={ref} />;
});

HeadMeta.displayName = "HeadMeta";
