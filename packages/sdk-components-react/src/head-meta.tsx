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

  const cleanProps = Object.fromEntries(
    Object.entries(props).filter(([_, value]) => value)
  );

  if (renderer === undefined) {
    return <meta {...cleanProps} />;
  }

  return <XmlNode tag={defaultTag} {...cleanProps} ref={ref} />;
});

HeadMeta.displayName = "HeadMeta";
