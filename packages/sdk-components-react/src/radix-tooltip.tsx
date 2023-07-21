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
 * Tooltip, TooltipTrigger are htmlless components, in our system in order to make them work
 * we need to wrap htmlless attributes with a div with display: contents
 */
const DisplayContentsStyle = { display: "contents" };

export const Tooltip = forwardRef<
  ElementRef<"div">,
  WebstudioAttributes & ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>
>((props, ref) => {
  const [webstudioAttributes, restProps] =
    splitPropsWithWebstudioAttributes(props);

  return (
    <div ref={ref} style={DisplayContentsStyle} {...webstudioAttributes}>
      <TooltipPrimitive.Root {...restProps} />
    </div>
  );
});

export const TooltipTrigger = forwardRef<
  ElementRef<"div">,
  WebstudioAttributes & { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];
  const [webstudioAttributes, restProps] =
    splitPropsWithWebstudioAttributes(props);

  /**
   * We are forcing asChild=true for the Trigger to make it work with our components in a consistent way
   */
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
