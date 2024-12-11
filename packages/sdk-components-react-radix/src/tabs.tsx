import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type ComponentProps,
  type RefAttributes,
} from "react";
import { Root, List, Trigger, Content } from "@radix-ui/react-tabs";
import {
  getClosestInstance,
  getIndexWithinAncestorFromComponentProps,
  type Hook,
} from "@webstudio-is/react-sdk/runtime";

export const Tabs: ForwardRefExoticComponent<
  Omit<ComponentProps<typeof Root>, "asChild"> & RefAttributes<HTMLDivElement>
> = Root;

export const TabsList = List;

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  Omit<ComponentPropsWithoutRef<typeof Trigger>, "value"> & { value?: string }
>(({ value, ...props }, ref) => {
  const index = getIndexWithinAncestorFromComponentProps(props);
  return <Trigger ref={ref} value={value ?? index ?? ""} {...props} />;
});

export const TabsContent = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof Content>, "value"> & { value?: string }
>(({ value, ...props }, ref) => {
  const index = getIndexWithinAncestorFromComponentProps(props);
  return <Content ref={ref} value={value ?? index ?? ""} {...props} />;
});

/* BUILDER HOOKS */

const namespace = "@webstudio-is/sdk-components-react-radix";

// For each TabsContent component within the selection,
// we identify its closest parent Tabs component
// and update its open prop bound to variable.
export const hooksTabs: Hook = {
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (
        instance.component === `${namespace}:TabsContent` ||
        instance.component === `${namespace}:TabsTrigger`
      ) {
        const tabs = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Tabs`
        );
        const contentValue =
          context.getPropValue(instance, "value") ??
          context.indexesWithinAncestors.get(instance.id)?.toString();
        if (tabs && contentValue) {
          context.setMemoryProp(tabs, "value", contentValue);
        }
      }
    }
  },
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (
        instance.component === `${namespace}:TabsContent` ||
        instance.component === `${namespace}:TabsTrigger`
      ) {
        const tabs = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Tabs`
        );
        const contentValue =
          context.getPropValue(instance, "value") ??
          context.indexesWithinAncestors.get(instance.id)?.toString();
        if (tabs && contentValue) {
          context.setMemoryProp(tabs, "value", undefined);
        }
      }
    }
  },
};
