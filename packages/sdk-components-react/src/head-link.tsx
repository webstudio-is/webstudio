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

export const HeadLink = forwardRef<
  ElementRef<"div">,
  { rel: LinkRel } & ComponentProps<typeof defaultTag>
>(({ ...props }, ref) => {
  const { renderer } = useContext(ReactSdkContext);

  if (renderer === undefined) {
    return <link {...props} />;
  }

  return <XmlNode tag={defaultTag} {...props} ref={ref} />;
});

HeadLink.displayName = "HeadLink";
