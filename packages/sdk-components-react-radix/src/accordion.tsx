import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type ComponentProps,
  type RefAttributes,
  useState,
  useEffect,
} from "react";
import {
  Root,
  Item,
  Header,
  Trigger,
  Content,
} from "@radix-ui/react-accordion";
import { getIndexWithinAncestorFromProps } from "@webstudio-is/sdk/runtime";

export const Accordion = forwardRef<
  HTMLDivElement,
  Omit<
    Extract<ComponentPropsWithoutRef<typeof Root>, { type: "single" }>,
    "type" | "asChild"
  >
>(({ defaultValue, ...props }, ref) => {
  const currentValue = props.value ?? defaultValue ?? "";
  const [value, setValue] = useState(currentValue);
  // synchronize external value with local one when changed
  useEffect(() => setValue(currentValue), [currentValue]);
  return (
    <Root
      {...props}
      ref={ref}
      type="single"
      value={value}
      onValueChange={setValue}
    />
  );
});

export const AccordionItem = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof Item>, "value"> & { value?: string }
>(({ value, ...props }, ref) => {
  const index = getIndexWithinAncestorFromProps(props);
  return <Item ref={ref} value={value ?? index ?? ""} {...props} />;
});

export const AccordionHeader: ForwardRefExoticComponent<
  Omit<ComponentProps<typeof Header>, "asChild"> &
    RefAttributes<HTMLHeadingElement>
> = Header;

export const AccordionTrigger: ForwardRefExoticComponent<
  Omit<ComponentProps<typeof Trigger>, "asChild"> &
    RefAttributes<HTMLButtonElement>
> = Trigger;

export const AccordionContent: ForwardRefExoticComponent<
  Omit<ComponentPropsWithoutRef<typeof Content>, "asChild" | "forceMount"> & {
    forceMount?: boolean;
  } & RefAttributes<HTMLDivElement>
> = forwardRef(({ forceMount, ...props }, ref) => (
  <Content ref={ref} forceMount={forceMount ? true : undefined} {...props} />
));
