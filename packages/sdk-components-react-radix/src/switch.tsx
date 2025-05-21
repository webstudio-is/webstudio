import {
  type ForwardRefExoticComponent,
  type ComponentProps,
  type RefAttributes,
  forwardRef,
  useEffect,
  useState,
} from "react";
import { Root, Thumb } from "@radix-ui/react-switch";

export const Switch = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Root>
>(({ defaultChecked, ...props }, ref) => {
  const currentChecked = props.checked ?? defaultChecked ?? false;
  const [checked, setChecked] = useState(currentChecked);
  // synchronize external value with local one when changed
  useEffect(() => setChecked(currentChecked), [currentChecked]);
  return (
    <Root {...props} ref={ref} checked={checked} onCheckedChange={setChecked} />
  );
});

export const SwitchThumb: ForwardRefExoticComponent<
  ComponentProps<typeof Thumb> & RefAttributes<HTMLSpanElement>
> = Thumb;
