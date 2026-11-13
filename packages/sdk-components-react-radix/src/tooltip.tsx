import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  Children,
  useState,
  useEffect,
} from "react";

export const Tooltip = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>, "defaultOpen">
>((props, _ref) => {
  const currentOpen = props.open ?? false;
  const [open, setOpen] = useState(currentOpen);
  // synchronize external value with local one when changed
  useEffect(() => setOpen(currentOpen), [currentOpen]);
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root {...props} open={open} onOpenChange={setOpen} />
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
