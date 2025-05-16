import {
  type ForwardRefExoticComponent,
  type ComponentPropsWithRef,
  forwardRef,
  type ComponentProps,
} from "react";
import { Root, Indicator } from "@radix-ui/react-checkbox";
import { useControllableState } from "@radix-ui/react-use-controllable-state";

export const Checkbox = forwardRef<
  HTMLButtonElement,
  // radix checked has complex named type which cannot be parsed
  // cast to boolean
  Omit<ComponentPropsWithRef<typeof Root>, "checked" | "defaultChecked"> & {
    checked?: boolean;
    defaultChecked?: boolean;
  }
>(({ defaultChecked, ...props }, ref) => {
  const [checked, onCheckedChange] = useControllableState({
    prop: props.checked ?? defaultChecked ?? false,
    defaultProp: false,
  });
  return (
    <Root
      {...props}
      ref={ref}
      checked={checked}
      onCheckedChange={(open) => onCheckedChange(open === true)}
    />
  );
});

export const CheckboxIndicator: ForwardRefExoticComponent<
  ComponentProps<typeof Indicator> & React.RefAttributes<HTMLSpanElement>
> = Indicator;
