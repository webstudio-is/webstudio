import { Content, type TabsContentProps } from "@radix-ui/react-tabs";
import { forwardRef, type ElementRef } from "react";

export const defaultTag = "div";

// @todo for some reason when I use typeof TabsContent, it looses the `value` type.
export const TabsContent = forwardRef<
  ElementRef<typeof defaultTag>,
  Omit<TabsContentProps, "value"> & {
    value?: TabsContentProps["value"];
  }
>(({ value = "tab", children, ...props }, ref) => (
  <Content value={value} {...props} ref={ref} />
));

TabsContent.displayName = "TabsContent";
