import type {
  ForwardRefExoticComponent,
  ComponentProps,
  RefAttributes,
} from "react";
import { Root, Thumb } from "@radix-ui/react-switch";

export const Switch: ForwardRefExoticComponent<
  ComponentProps<typeof Root> & RefAttributes<HTMLButtonElement>
> = Root;

export const SwitchThumb: ForwardRefExoticComponent<
  ComponentProps<typeof Thumb> & RefAttributes<HTMLSpanElement>
> = Thumb;
