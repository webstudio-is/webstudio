/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { getClosestInstance, type Hook } from "@webstudio-is/react-sdk";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  Children,
} from "react";

export const Tooltip = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>, "defaultOpen">
>((props, _ref) => {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root {...props} />
    </TooltipPrimitive.Provider>
  );
});

/**
 * We're not exposing the 'asChild' property for the Trigger.
 * Instead, we're enforcing 'asChild=true' for the Trigger and making it style-less.
 * This avoids situations where the Trigger inadvertently passes all styles to its child,
 * which would prevent us from displaying styles properly in the builder.
 */
export const TooltipTrigger = forwardRef<
  HTMLButtonElement,
  { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];

  return (
    <TooltipPrimitive.Trigger asChild={true} ref={ref} {...props}>
      {firstChild ?? <button>Add button or link</button>}
    </TooltipPrimitive.Trigger>
  );
});

export const TooltipContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ sideOffset = 4, hideWhenDetached = true, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      // Do not show content if trigger is detached
      hideWhenDetached={hideWhenDetached}
      sideOffset={sideOffset}
      {...props}
    />
  </TooltipPrimitive.Portal>
));

/* BUILDER HOOKS */

const namespace = "@webstudio-is/sdk-components-react-radix";

// For each TooltipContent component within the selection,
// we identify its closest parent Tooltip component
// and update its open prop bound to variable.
export const hooksTooltip: Hook = {
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:TooltipContent`) {
        const tooltip = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Tooltip`
        );
        if (tooltip) {
          context.setPropVariable(tooltip.id, "open", false);
        }
      }
    }
  },
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:TooltipContent`) {
        const tooltip = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Tooltip`
        );
        if (tooltip) {
          context.setPropVariable(tooltip.id, "open", true);
        }
      }
    }
  },
};
