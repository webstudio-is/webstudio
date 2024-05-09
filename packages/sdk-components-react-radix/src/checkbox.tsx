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
  Omit<ComponentPropsWithRef<typeof Root>, "checked"> & { checked: boolean }
>((props, ref) => {
  return <Root ref={ref} {...props} />;
});

export const CheckboxIndicator: ForwardRefExoticComponent<
  ComponentProps<typeof Indicator> & React.RefAttributes<HTMLSpanElement>
> = Indicator;
