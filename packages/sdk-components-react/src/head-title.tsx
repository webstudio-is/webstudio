import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
} from "react";
import { XmlNode } from "./xml-node";

export const defaultTag = "title";

const PROPS_ORDER = [] as const;

export const HeadTitle = forwardRef<
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
    if (prop in props && Boolean(props[prop])) {
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

HeadTitle.displayName = "HeadTitle";
