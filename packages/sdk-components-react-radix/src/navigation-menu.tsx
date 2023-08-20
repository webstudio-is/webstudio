/* eslint-disable react/display-name */
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { getClosestInstance, type Hook } from "@webstudio-is/react-sdk";
import {
  Children,
  forwardRef,
  // type ComponentPropsWithoutRef,
  // type ElementRef,
  type ReactNode,
} from "react";

export const NavigationMenu = NavigationMenuPrimitive.Root;
export const NavigationMenuList = NavigationMenuPrimitive.List;
export const NavigationMenuItem = NavigationMenuPrimitive.Item;

export const NavigationMenuViewport = NavigationMenuPrimitive.Viewport;
export const NavigationMenuContent = NavigationMenuPrimitive.Content;

export const NavigationMenuLink = forwardRef<
  HTMLAnchorElement,
  { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];

  return (
    <NavigationMenuPrimitive.Link asChild={true} ref={ref} {...props}>
      {firstChild ?? <a>Add link component</a>}
    </NavigationMenuPrimitive.Link>
  );
});

export const NavigationMenuTrigger = forwardRef<
  HTMLButtonElement,
  { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];

  return (
    <NavigationMenuPrimitive.Trigger asChild={true} ref={ref} {...props}>
      {firstChild ?? <button>Add button or link</button>}
    </NavigationMenuPrimitive.Trigger>
  );
});

const namespace = "@webstudio-is/sdk-components-react-radix";

// For each TabsContent component within the selection,
// we identify its closest parent NavigationMenu component
// and update its open prop bound to variable.
export const hooksTabs: Hook = {
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:NavigationMenuContent`) {
        const menu = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:NavigationMenu`
        );
        const contentValue =
          context.getPropValue(instance.id, "value") ??
          context.indexesWithinAncestors.get(instance.id)?.toString();
        if (menu && contentValue) {
          context.setPropVariable(menu.id, "value", contentValue);
        }
      }
    }
  },
};
