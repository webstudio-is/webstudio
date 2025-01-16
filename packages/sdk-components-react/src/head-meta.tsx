import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
} from "react";
import { XmlNode } from "./xml-node";

export const defaultTag = "meta";

export const HeadMeta = forwardRef<
  ElementRef<"div">,
  ComponentProps<typeof defaultTag>
>(({ ...props }, ref) => {
  const { renderer } = useContext(ReactSdkContext);

  if (renderer === undefined) {
    return <meta {...props} />;
  }

  return <XmlNode tag={defaultTag} {...props} ref={ref} />;
});

HeadMeta.displayName = "HeadMeta";
