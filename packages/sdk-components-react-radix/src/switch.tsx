import {
  type ForwardRefExoticComponent,
  type ComponentProps,
  type RefAttributes,
  forwardRef,
} from "react";
import { Root, Thumb } from "@radix-ui/react-switch";

export const Switch = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Root>
>(({ defaultChecked, checked, ...props }, ref) => {
  return (
    <Root {...props} ref={ref} defaultChecked={checked ?? defaultChecked} />
  );
});

export const SwitchThumb: ForwardRefExoticComponent<
  ComponentProps<typeof Thumb> & RefAttributes<HTMLSpanElement>
> = Thumb;
