/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import {
  type ForwardRefExoticComponent,
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  forwardRef,
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
  ComponentPropsWithRef<typeof Trigger>
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
  ComponentPropsWithRef<typeof Viewport>
> = Viewport;

export const SelectItem: ForwardRefExoticComponent<
  ComponentPropsWithRef<typeof Item>
> = Item;

export const SelectItemIndicator: ForwardRefExoticComponent<
  ComponentPropsWithRef<typeof ItemIndicator>
> = ItemIndicator;

export const SelectItemText: ForwardRefExoticComponent<
  ComponentPropsWithRef<typeof ItemText>
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
