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
  { "data-ws-expand"?: boolean } & Omit<
    ComponentProps<typeof defaultTag>,
    "ref"
  >
>(({ children, ...props }, ref) => {
  const { renderer } = useContext(ReactSdkContext);

  if (renderer === undefined) {
    return children;
  }

  if (props["data-ws-expand"] !== true) {
    return null;
  }

  return (
    <div
      ref={ref}
      style={{
        backgroundColor: "rgba(255,255,255,1)",
        padding: "8px",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
      {...props}
    >
      <XmlNode tag={defaultTag}>{children}</XmlNode>
    </div>
  );
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
