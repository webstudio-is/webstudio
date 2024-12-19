import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import {
  getClosestInstance,
  getIndexWithinAncestorFromComponentProps,
  ReactSdkContext,
  type Hook,
} from "@webstudio-is/react-sdk/runtime";
import {
  Children,
  forwardRef,
  type ComponentPropsWithoutRef,
  useContext,
} from "react";

export const NavigationMenu = forwardRef<
  HTMLLIElement,
  Omit<
    ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>,
    "orientation" | "aria-orientation"
  >
>(({ value: propsValue, ...props }, ref) => {
  /**
   * If the value is an empty string, "NavigationMenuViewport" isn't in the tree.
   * This is Radix's way to differentiate animations. However, in the builder, we can't style non-existing elements.
   * Since we don't need animations in the builder, we can trick Radix by setting a non-empty string like "-1" to the value property.
   * This ensures "NavigationMenuViewport" always appears in the HTML tree.
   **/
  const { renderer } = useContext(ReactSdkContext);
  let value = propsValue;
  if (renderer === "canvas") {
    value = value === "" ? "-1" : value;
  }

  return <NavigationMenuPrimitive.Root ref={ref} value={value} {...props} />;
});

export const NavigationMenuList = NavigationMenuPrimitive.List;

export const NavigationMenuViewport = NavigationMenuPrimitive.Viewport;
export const NavigationMenuContent = NavigationMenuPrimitive.Content;

export const NavigationMenuItem = forwardRef<
  HTMLLIElement,
  Omit<ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Item>, "asChild">
>(({ value, ...props }, ref) => {
  const index = getIndexWithinAncestorFromComponentProps(props);
  return (
    <NavigationMenuPrimitive.Item ref={ref} value={value ?? index} {...props} />
  );
});

export const NavigationMenuLink = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link>
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
  ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];

  return (
    <NavigationMenuPrimitive.Trigger asChild={true} ref={ref} {...props}>
      {firstChild ?? <button>Add button or link</button>}
    </NavigationMenuPrimitive.Trigger>
  );
});

const namespace = "@webstudio-is/sdk-components-react-radix";

// For each NavigationMenuItem component within the selection,
// we identify its closest parent NavigationMenu component
// and update its open prop bound to variable.
export const hooksNavigationMenu: Hook = {
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:NavigationMenuContent`) {
        const menu = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:NavigationMenu`
        );
        if (menu) {
          context.setMemoryProp(menu, "value", undefined);
        }
      }
    }
  },
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:NavigationMenuContent`) {
        const menu = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:NavigationMenu`
        );
        const menuItem = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:NavigationMenuItem`
        );
        if (menuItem === undefined || menu === undefined) {
          return;
        }
        const contentValue =
          context.getPropValue(menuItem, "value") ??
          context.indexesWithinAncestors.get(menuItem.id)?.toString();
        if (contentValue) {
          context.setMemoryProp(menu, "value", contentValue);
        }
      }
    }
  },
};
