import {
  type ForwardRefExoticComponent,
  type ComponentPropsWithRef,
  forwardRef,
  type ComponentProps,
} from "react";
import { Root, Indicator } from "@radix-ui/react-checkbox";

export const Checkbox = forwardRef<
  HTMLButtonElement,
  // radix checked has complex named type which cannot be parsed
  // cast to boolean
  Omit<ComponentPropsWithRef<typeof Root>, "checked" | "defaultChecked"> & {
    checked?: boolean;
    defaultChecked?: boolean;
  }
>(({ checked, defaultChecked, ...props }, ref) => {
  return (
    <Root {...props} ref={ref} defaultChecked={checked ?? defaultChecked} />
  );
});

export const CheckboxIndicator: ForwardRefExoticComponent<
  ComponentProps<typeof Indicator> & React.RefAttributes<HTMLSpanElement>
> = Indicator;
