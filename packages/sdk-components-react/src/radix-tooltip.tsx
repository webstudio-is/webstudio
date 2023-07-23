/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  splitPropsWithWebstudioAttributes,
  type WebstudioAttributes,
} from "@webstudio-is/react-sdk";

import {
  forwardRef,
  type ElementRef,
  type ComponentPropsWithoutRef,
  Children,
  type ReactNode,
} from "react";

/**
 * We don't have support for boolean or undefined nor in UI not at Data variables,
 * instead of binding on "open" prop we bind variable on a isOpen prop to be able to show Tooltip in the builder
 **/
type BuilderTooltipProps = {
  isOpen: "initial" | "open" | "closed";
};

/**
 * Tooltip and TooltipTrigger are HTML-less components.
 * To make them work in our system, we wrap their attributes with a div that has a display: contents property.
 *
 * These divs function like fragments, with all web studio-related attributes attached to them.
 */
const DisplayContentsStyle = { display: "contents" };

export const Tooltip = forwardRef<
  ElementRef<"div">,
  WebstudioAttributes &
    ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> &
    BuilderTooltipProps
>(({ open: openProp, isOpen, ...props }, ref) => {
  const [webstudioAttributes, restProps] =
    splitPropsWithWebstudioAttributes(props);

  const open =
    openProp ??
    (isOpen === "open" ? true : isOpen === "closed" ? false : undefined);

  return (
    <div ref={ref} style={DisplayContentsStyle} {...webstudioAttributes}>
      <TooltipPrimitive.Root open={open} {...restProps} />
    </div>
  );
});

/**
 * We're not exposing the 'asChild' property for the Trigger.
 * Instead, we're enforcing 'asChild=true' for the Trigger and making it style-less.
 * This avoids situations where the Trigger inadvertently passes all styles to its child,
 * which would prevent us from displaying styles properly in the builder.
 */
export const TooltipTrigger = forwardRef<
  ElementRef<"div">,
  WebstudioAttributes & { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];
  const [webstudioAttributes, restProps] =
    splitPropsWithWebstudioAttributes(props);

  return (
    <div ref={ref} style={DisplayContentsStyle} {...webstudioAttributes}>
      <TooltipPrimitive.Trigger asChild={true} {...restProps}>
        {firstChild ?? <button>Add button or link</button>}
      </TooltipPrimitive.Trigger>
    </div>
  );
});

export const TooltipContent = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} {...props} />
  </TooltipPrimitive.Portal>
));
