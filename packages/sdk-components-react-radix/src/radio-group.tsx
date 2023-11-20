import {
  type ForwardRefExoticComponent,
  type ComponentPropsWithRef,
} from "react";
import { Root, Item, Indicator } from "@radix-ui/react-radio-group";

export const RadioGroup: ForwardRefExoticComponent<
  ComponentPropsWithRef<typeof Root>
> = Root;

export const RadioGroupItem: ForwardRefExoticComponent<
  ComponentPropsWithRef<typeof Item>
> = Item;

export const RadioGroupIndicator: ForwardRefExoticComponent<
  ComponentPropsWithRef<typeof Indicator>
> = Indicator;
