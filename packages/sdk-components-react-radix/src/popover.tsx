/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  Children,
} from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { getClosestInstance, type Hook } from "@webstudio-is/react-sdk";

// wrap in forwardRef because Root is functional component without ref
export const Popover = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>, "defaultOpen">
>((props, _ref) => {
  return <PopoverPrimitive.Root {...props} />;
});

/**
 * We're not exposing the 'asChild' property for the Trigger.
 * Instead, we're enforcing 'asChild=true' for the Trigger and making it style-less.
 * This avoids situations where the Trigger inadvertently passes all styles to its child,
 * which would prevent us from displaying styles properly in the builder.
 */
export const PopoverTrigger = forwardRef<
  HTMLButtonElement,
  { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];

  return (
    <PopoverPrimitive.Trigger asChild={true} ref={ref} {...props}>
      {firstChild ?? <button>Add button or link</button>}
    </PopoverPrimitive.Trigger>
  );
});

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(
  (
    { sideOffset = 4, align = "center", hideWhenDetached = true, ...props },
    ref
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align="center"
        sideOffset={sideOffset}
        hideWhenDetached={hideWhenDetached}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
);

/* BUILDER HOOKS */

const namespace = "@webstudio-is/sdk-components-react-radix";

// For each PopoverContent component within the selection,
// we identify its closest parent Popover component
// and update its open prop bound to variable.
export const hooksPopover: Hook = {
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:PopoverContent`) {
        const popover = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Popover`
        );
        if (popover) {
          context.setPropVariable(popover.id, "open", false);
        }
      }
    }
  },
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:PopoverContent`) {
        const popover = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Popover`
        );
        if (popover) {
          context.setPropVariable(popover.id, "open", true);
        }
      }
    }
  },
};
