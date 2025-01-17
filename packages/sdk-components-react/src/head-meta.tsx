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
    // We are deduplicating meta tags on the server using the HTMLRewriter interface.
    // To ensure React on the client does not re-add removed meta tags, we skip rendering them client-side.
    // This method works because React preserves server-rendered meta tags when they are not re-rendered by the client.
    if (typeof window === "undefined") {
      return <meta {...props} />;
    }

    // Allow the viewport meta tag to be rendered on the client. (Last wins)
    if (props.name === "viewport") {
      return <meta {...props} />;
    }
    return;
  }

  return <XmlNode tag={defaultTag} {...props} ref={ref} />;
});

HeadMeta.displayName = "HeadMeta";
