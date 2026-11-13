import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { forwardRef, type ElementRef, useContext, type ReactNode } from "react";
import { HeadSlotContext } from "./head-slot-context";
import { XmlNode } from "./xml-node";

export const defaultTag = "head";

export const HeadSlot = forwardRef<
  ElementRef<"div">,
  { "data-ws-expand"?: boolean } & { children: ReactNode }
>(({ children, ...props }, ref) => {
  const { renderer } = useContext(ReactSdkContext);

  if (renderer === undefined) {
    return (
      <HeadSlotContext.Provider value={true}>
        {children}
      </HeadSlotContext.Provider>
    );
  }

  if (props["data-ws-expand"] !== true) {
    return null;
  }

  return (
    <div
      ref={ref}
      style={{
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
