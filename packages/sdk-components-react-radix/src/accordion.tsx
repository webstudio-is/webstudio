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
import { getClosestInstance, type Hook } from "@webstudio-is/react-sdk/runtime";

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
  Omit<ComponentProps<typeof Content>, "asChild"> &
    RefAttributes<HTMLDivElement>
> = Content;

/* BUILDER HOOKS */

const namespace = "@webstudio-is/sdk-components-react-radix";

// For each AccordionContent component within the selection,
// we identify its closest parent Accordion component
// and update its open prop bound to variable.
export const hooksAccordion: Hook = {
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:AccordionContent`) {
        const accordion = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Accordion`
        );
        const item = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:AccordionItem`
        );
        if (accordion && item) {
          const itemValue =
            context.getPropValue(item, "value") ??
            context.indexesWithinAncestors.get(item.id)?.toString();

          if (itemValue) {
            context.setMemoryProp(accordion, "value", itemValue);
          }
        }
      }
    }
  },
};
