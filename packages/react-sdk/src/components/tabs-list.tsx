import { List, type TabsListProps } from "@radix-ui/react-tabs";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

export const defaultTag = "div";

// @todo for some reason when I use typeof TabsContent, it looses the `value` type.
export const TabsList: ForwardRefExoticComponent<
  Omit<TabsListProps, "loop"> & {
    loop?: TabsListProps["loop"];
  } & RefAttributes<HTMLDivElement>
> = List;
