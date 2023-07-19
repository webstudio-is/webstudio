/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

// meta.stylable
/*
 className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}

*/

import * as TooltipPrimitive from "@radix-ui/react-tooltip";

const idAttribute = "data-ws-id" as const;
const componentAttribute = "data-ws-component" as const;
const showAttribute = "data-ws-show" as const;
const collapsedAttribute = "data-ws-collapsed" as const;

type WebstudioAttributes =
  | typeof idAttribute
  | typeof componentAttribute
  | typeof showAttribute
  | typeof collapsedAttribute;

type WebstudioAtributesProps = { [key in WebstudioAttributes]: string };

import {
  forwardRef,
  type ElementRef,
  type ComponentPropsWithoutRef,
  Children,
  type ReactNode,
} from "react";

// ref={instanceElementRef}

const DisplayContentsStyle = { display: "contents" };

export const Tooltip = forwardRef<
  ElementRef<"div">,
  WebstudioAtributesProps &
    ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>
>(
  (
    {
      [idAttribute]: idAttributeValue,
      [componentAttribute]: componentAttributeValue,
      [showAttribute]: showAttributeValue,
      [collapsedAttribute]: collapsedAttributeValue,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      style={DisplayContentsStyle}
      {...{
        [idAttribute]: idAttributeValue,
        [componentAttribute]: componentAttributeValue,
        [showAttribute]: showAttributeValue,
        [collapsedAttribute]: collapsedAttributeValue,
      }}
    >
      <TooltipPrimitive.Root {...props} />
    </div>
  )
);

// To avoid issues like button inside button, we make asChild=true the default
// Also we set meta.stylable = false to not have any styling issues
export const TooltipTrigger = forwardRef<
  ElementRef<"div">,
  WebstudioAtributesProps & { children: ReactNode }
>(
  (
    {
      [idAttribute]: idAttributeValue,
      [componentAttribute]: componentAttributeValue,
      [showAttribute]: showAttributeValue,
      [collapsedAttribute]: collapsedAttributeValue,
      children,
      ...props
    },
    ref
  ) => {
    const firstChild = Children.toArray(children)[0];

    return (
      <div
        ref={ref}
        style={DisplayContentsStyle}
        {...{
          [idAttribute]: idAttributeValue,
          [componentAttribute]: componentAttributeValue,
          [showAttribute]: showAttributeValue,
          [collapsedAttribute]: collapsedAttributeValue,
        }}
      >
        <TooltipPrimitive.Trigger asChild={true} {...props}>
          {firstChild ?? <button>Add button or link</button>}
        </TooltipPrimitive.Trigger>
      </div>
    );
  }
);

export const TooltipContent = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} {...props} />
  </TooltipPrimitive.Portal>
));
