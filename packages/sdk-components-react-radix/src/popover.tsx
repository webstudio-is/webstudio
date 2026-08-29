import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  Children,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  getClosestInstance,
  ReactSdkContext,
  type Hook,
} from "@webstudio-is/react-sdk/runtime";
import {
  getLinkActivation,
  NavigationOverlayContext,
  useNavigationOverlay,
} from "./navigation-overlay";

// wrap in forwardRef because Root is functional component without ref
export const Popover = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>, "defaultOpen">
>((props, _ref) => {
  const currentOpen = props.open ?? false;
  const [open, setOpen] = useState(currentOpen);
  // synchronize external value with local one when changed
  useEffect(() => setOpen(currentOpen), [currentOpen]);
  const close = useCallback(() => setOpen(false), []);
  return (
    <NavigationOverlayContext.Provider value={close}>
      <PopoverPrimitive.Root {...props} open={open} onOpenChange={setOpen} />
    </NavigationOverlayContext.Provider>
  );
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
    {
      sideOffset = 4,
      align = "center",
      hideWhenDetached = true,
      onClickCapture,
      ...props
    },
    ref
  ) => {
    const close = useNavigationOverlay();
    const { renderer } = useContext(ReactSdkContext);

    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          align="center"
          sideOffset={sideOffset}
          hideWhenDetached={hideWhenDetached}
          {...props}
          onClickCapture={(event) => {
            onClickCapture?.(event);
            // Preview mirrors the published site; Canvas stays open for editing.
            if (renderer !== "canvas" && getLinkActivation(event)) {
              close?.();
            }
          }}
        />
      </PopoverPrimitive.Portal>
    );
  }
);

export const PopoverClose = PopoverPrimitive.Close;

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
          context.setMemoryProp(popover, "open", undefined);
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
          context.setMemoryProp(popover, "open", true);
        }
      }
    }
  },
};
