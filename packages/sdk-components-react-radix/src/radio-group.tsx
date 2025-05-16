import {
  type ForwardRefExoticComponent,
  type ComponentProps,
  type RefAttributes,
  type ElementRef,
  forwardRef,
} from "react";
import { Root, Item, Indicator } from "@radix-ui/react-radio-group";
import { useControllableState } from "@radix-ui/react-use-controllable-state";

const defaultTag = "div";

export const RadioGroup = forwardRef<
  ElementRef<typeof defaultTag>,
  ComponentProps<typeof Root> & RefAttributes<typeof defaultTag>
  // Make sure children are not passed down to an input, because this will result in error.
>(({ defaultValue, ...props }, ref) => {
  const [value, onValueChange] = useControllableState({
    prop: props.value ?? defaultValue ?? "",
    defaultProp: "",
  });
  return (
    <Root {...props} value={value} onValueChange={onValueChange} ref={ref} />
  );
});

export const RadioGroupItem: ForwardRefExoticComponent<
  ComponentProps<typeof Item> & RefAttributes<HTMLButtonElement>
> = Item;

export const RadioGroupIndicator: ForwardRefExoticComponent<
  ComponentProps<typeof Indicator> & RefAttributes<HTMLSpanElement>
> = Indicator;
