import { forwardRef, type ElementRef } from "react";
import { Trigger, type TabsTriggerProps } from "@radix-ui/react-tabs";

export const defaultTag = "button";

export const TabsTrigger = forwardRef<
  ElementRef<typeof defaultTag>,
  Omit<TabsTriggerProps, "value"> & {
    innerText?: string;
    value?: TabsTriggerProps["value"];
  }
>(({ innerText = "Tab", value = "tab", children, ...props }, ref) => (
  <Trigger value={value} {...props} ref={ref}>
    {children || innerText}
  </Trigger>
));

TabsTrigger.displayName = "TabsTrigger";
