import {
  getClosestInstance,
  ReactSdkContext,
  type Hook,
} from "@webstudio-is/react-sdk/runtime";
import {
  forwardRef,
  type ElementRef,
  type ComponentProps,
  useContext,
} from "react";
import { XmlNode } from "./xml-node";

export const defaultTag = "head";

export const Head = forwardRef<
  ElementRef<"div">,
  { "data-ws-expand": boolean } & ComponentProps<typeof defaultTag>
>(({ ...props }, ref) => {
  const { renderer } = useContext(ReactSdkContext);

  if (props["data-ws-expand"] !== true) {
    return null;
  }

  if (renderer === undefined) {
    return props.children;
  }

  return <XmlNode tag={defaultTag} {...props} ref={ref} />;
});

Head.displayName = "Head";

export const hooksHead: Hook = {
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `Head`) {
        const popover = getClosestInstance(
          event.instancePath,
          instance,
          `Head`
        );
        if (popover) {
          context.setMemoryProp(popover, "data-ws-expand", undefined);
        }
      }
    }
  },
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `Head`) {
        const popover = getClosestInstance(
          event.instancePath,
          instance,
          `Head`
        );
        if (popover) {
          context.setMemoryProp(popover, "data-ws-expand", true);
        }
      }
    }
  },
};
