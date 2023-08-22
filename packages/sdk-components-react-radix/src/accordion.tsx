/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type ComponentPropsWithRef,
  forwardRef,
} from "react";
import {
  Root,
  Item,
  Header,
  Trigger,
  Content,
} from "@radix-ui/react-accordion";
import {
  getClosestInstance,
  getIndexWithinAncestorFromComponentProps,
  type Hook,
} from "@webstudio-is/react-sdk";

export const Accordion = forwardRef<
  HTMLDivElement,
  Omit<
    ComponentPropsWithoutRef<typeof Root>,
    "type" | "asChild" | "defaultValue" | "value" | "onValueChange"
  > & {
    value: string;
    onValueChange: (value: string) => void;
  }
>((props, ref) => {
  return <Root ref={ref} type="single" {...props} />;
});

export const AccordionItem = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof Item>, "asChild">
>(({ value, ...props }, ref) => {
  const index = getIndexWithinAncestorFromComponentProps(props);
  return <Item ref={ref} value={value ?? index} {...props} />;
});

export const AccordionHeader: ForwardRefExoticComponent<
  Omit<ComponentPropsWithRef<typeof Header>, "asChild">
> = Header;

export const AccordionTrigger: ForwardRefExoticComponent<
  Omit<ComponentPropsWithRef<typeof Trigger>, "asChild">
> = Trigger;

export const AccordionContent: ForwardRefExoticComponent<
  Omit<ComponentPropsWithRef<typeof Content>, "asChild">
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
            context.getPropValue(item.id, "value") ??
            context.indexesWithinAncestors.get(item.id)?.toString();
          if (itemValue) {
            context.setPropVariable(accordion.id, "value", itemValue);
          }
        }
      }
    }
  },
};
