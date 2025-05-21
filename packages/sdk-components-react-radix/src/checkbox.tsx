import {
  type ForwardRefExoticComponent,
  type ComponentPropsWithRef,
  forwardRef,
  type ComponentProps,
  useState,
  useEffect,
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
>(({ defaultChecked, ...props }, ref) => {
  const currentChecked = props.checked ?? defaultChecked ?? false;
  const [checked, setChecked] = useState(currentChecked);
  // synchronize external value with local one when changed
  useEffect(() => setChecked(currentChecked), [currentChecked]);
  return (
    <Root
      {...props}
      ref={ref}
      checked={checked}
      onCheckedChange={(open) => setChecked(open === true)}
    />
  );
});

export const CheckboxIndicator: ForwardRefExoticComponent<
  ComponentProps<typeof Indicator> & React.RefAttributes<HTMLSpanElement>
> = Indicator;
