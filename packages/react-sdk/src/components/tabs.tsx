import { Root, type TabsProps } from "@radix-ui/react-tabs";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

export const defaultTag = "div";

export const Tabs: ForwardRefExoticComponent<
  Omit<
    TabsProps,
    "defaultValue" | "value" | "activationMode" | "orientation"
  > & {
    defaultValue?: TabsProps["defaultValue"];
    value?: TabsProps["value"];
    activationMode?: TabsProps["activationMode"];
    orientation?: TabsProps["orientation"];
  } & RefAttributes<HTMLDivElement>
> = Root;
