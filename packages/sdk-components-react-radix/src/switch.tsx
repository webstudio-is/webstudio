import type { ForwardRefExoticComponent, ComponentPropsWithRef } from "react";
import { Root, Thumb } from "@radix-ui/react-switch";

export const Switch: ForwardRefExoticComponent<
  ComponentPropsWithRef<typeof Root>
> = Root;

export const SwitchThumb: ForwardRefExoticComponent<
  ComponentPropsWithRef<typeof Thumb>
> = Thumb;
