import {
  type ForwardRefExoticComponent,
  type ComponentProps,
  type RefAttributes,
  forwardRef,
} from "react";
import { Root, Thumb } from "@radix-ui/react-switch";
import { useControllableState } from "@radix-ui/react-use-controllable-state";

export const Switch = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Root>
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
      onCheckedChange={onCheckedChange}
    />
  );
});

export const SwitchThumb: ForwardRefExoticComponent<
  ComponentProps<typeof Thumb> & RefAttributes<HTMLSpanElement>
> = Thumb;
