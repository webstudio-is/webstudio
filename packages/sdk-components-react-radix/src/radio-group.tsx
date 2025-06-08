import {
  type ForwardRefExoticComponent,
  type ComponentProps,
  type RefAttributes,
  type ElementRef,
  forwardRef,
  useState,
  useEffect,
} from "react";
import { Root, Item, Indicator } from "@radix-ui/react-radio-group";

export const RadioGroup = forwardRef<
  ElementRef<"div">,
  ComponentProps<typeof Root>
>(({ defaultValue, ...props }, ref) => {
  const currentValue = props.value ?? defaultValue ?? "";
  const [value, setValue] = useState(currentValue);
  // synchronize external value with local one when changed
  useEffect(() => setValue(currentValue), [currentValue]);
  return <Root {...props} ref={ref} value={value} onValueChange={setValue} />;
});

export const RadioGroupItem: ForwardRefExoticComponent<
  ComponentProps<typeof Item> & RefAttributes<HTMLButtonElement>
> = Item;

export const RadioGroupIndicator: ForwardRefExoticComponent<
  ComponentProps<typeof Indicator> & RefAttributes<HTMLSpanElement>
> = Indicator;
