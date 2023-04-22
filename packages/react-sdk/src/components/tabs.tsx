import { Root, type TabsProps } from "@radix-ui/react-tabs";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

export const defaultTag = "div";

export const Tabs: ForwardRefExoticComponent<
  Omit<TabsProps, "defaultValue" | "activationMode" | "orientation"> & {
    defaultValue?: TabsProps["defaultValue"];
    activationMode?: TabsProps["activationMode"];
    orientation?: TabsProps["orientation"];
  } & RefAttributes<HTMLDivElement>
> = Root;
