/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import {
  type ForwardRefExoticComponent,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  forwardRef,
  type RefAttributes,
} from "react";
import {
  Root,
  Value,
  Trigger,
  Content,
  Item,
  ItemIndicator,
  ItemText,
  Portal,
  Viewport,
} from "@radix-ui/react-select";
import { type Hook, getClosestInstance } from "@webstudio-is/react-sdk";

// wrap in forwardRef because Root is functional component without ref
export const Select = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Root>
>((props, _ref) => {
  return <Root {...props} />;
});

export const SelectTrigger: ForwardRefExoticComponent<
  ComponentProps<typeof Trigger> & RefAttributes<HTMLButtonElement>
> = Trigger;

export const SelectValue = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof Value>, "placeholder"> & {
    placeholder?: string;
  }
>((props, ref) => {
  return <Value ref={ref} {...props} />;
});

export const SelectContent = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof Content>, "position" | "side">
>((props, ref) => {
  return (
    <Portal>
      <Content ref={ref} {...props} position="popper" />
    </Portal>
  );
});

export const SelectViewport: ForwardRefExoticComponent<
  ComponentProps<typeof Viewport> & RefAttributes<HTMLDivElement>
> = Viewport;

export const SelectItem: ForwardRefExoticComponent<
  ComponentProps<typeof Item> & RefAttributes<HTMLDivElement>
> = Item;

export const SelectItemIndicator: ForwardRefExoticComponent<
  ComponentProps<typeof ItemIndicator> & RefAttributes<HTMLSpanElement>
> = ItemIndicator;

export const SelectItemText: ForwardRefExoticComponent<
  ComponentProps<typeof ItemText> & RefAttributes<HTMLSpanElement>
> = ItemText;

/* BUILDER HOOKS */

const namespace = "@webstudio-is/sdk-components-react-radix";

// For each SelectContent component within the selection,
// we identify its closest parent Select component
// and update its open prop bound to variable.
export const hooksSelect: Hook = {
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:SelectContent`) {
        const select = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Select`
        );
        if (select) {
          context.setPropVariable(select.id, "open", false);
        }
      }
    }
  },
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:SelectContent`) {
        const select = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Select`
        );
        if (select) {
          context.setPropVariable(select.id, "open", true);
        }
      }
    }
  },
};
