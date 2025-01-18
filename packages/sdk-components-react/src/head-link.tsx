import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
} from "react";
import { XmlNode } from "./xml-node";

export const defaultTag = "link";

type LinkRel =
  | "alternate"
  | "author"
  | "canonical"
  | "dns-prefetch"
  | "help"
  | "icon"
  | "license"
  | "manifest"
  | "modulepreload"
  | "next"
  | "nofollow"
  | "noopener"
  | "noreferrer"
  | "opener"
  | "pingback"
  | "preconnect"
  | "prefetch"
  | "preload"
  | "prev"
  | "search"
  | "stylesheet"
  | "tag";

type LinkAs =
  | "audio"
  | "document"
  | "embed"
  | "fetch"
  | "font"
  | "image"
  | "object"
  | "script"
  | "style"
  | "track"
  | "video"
  | "worker";

const PROPS_ORDER = ["rel", "href", "type", "hrefLang", "as"] as const;

export const HeadLink = forwardRef<
  ElementRef<"div">,
  { rel: LinkRel; as: LinkAs } & ComponentProps<typeof defaultTag>
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
    return <link {...cleanOrderedProps} />;
  }

  return <XmlNode tag={defaultTag} {...cleanOrderedProps} ref={ref} />;
});

HeadLink.displayName = "HeadLink";
