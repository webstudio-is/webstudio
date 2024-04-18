import {
  type ForwardRefExoticComponent,
  type ComponentProps,
  type RefAttributes,
} from "react";
import { Root, Item, Indicator } from "@radix-ui/react-radio-group";

export const RadioGroup: ForwardRefExoticComponent<
  ComponentProps<typeof Root> & RefAttributes<HTMLDivElement>
> = Root;

export const RadioGroupItem: ForwardRefExoticComponent<
  ComponentProps<typeof Item> & RefAttributes<HTMLButtonElement>
> = Item;

export const RadioGroupIndicator: ForwardRefExoticComponent<
  ComponentProps<typeof Indicator> & RefAttributes<HTMLSpanElement>
> = Indicator;
