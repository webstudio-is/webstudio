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

export const HeadSlot = forwardRef<
  ElementRef<"div">,
  { "data-ws-expand"?: boolean } & ComponentProps<typeof defaultTag>
>(({ ...props }, ref) => {
  const { renderer } = useContext(ReactSdkContext);

  if (renderer === undefined) {
    return props.children;
  }

  if (props["data-ws-expand"] !== true) {
    return null;
  }

  return <XmlNode tag={defaultTag} {...props} ref={ref} />;
});

HeadSlot.displayName = "HeadSlot";

export const hooksHeadSlot: Hook = {
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `HeadSlot`) {
        const popover = getClosestInstance(
          event.instancePath,
          instance,
          `HeadSlot`
        );
        if (popover) {
          context.setMemoryProp(popover, "data-ws-expand", undefined);
        }
      }
    }
  },
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `HeadSlot`) {
        const popover = getClosestInstance(
          event.instancePath,
          instance,
          `HeadSlot`
        );
        if (popover) {
          context.setMemoryProp(popover, "data-ws-expand", true);
        }
      }
    }
  },
};
