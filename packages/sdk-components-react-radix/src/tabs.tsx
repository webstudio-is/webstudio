import interactionResponse from "await-interaction-response";
import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  forwardRef,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Root, List, Trigger, Content } from "@radix-ui/react-tabs";
import { getIndexWithinAncestorFromProps } from "@webstudio-is/sdk/runtime";
import { getClosestInstance, type Hook } from "@webstudio-is/react-sdk/runtime";

export const Tabs = forwardRef<HTMLDivElement, ComponentProps<typeof Root>>(
  ({ defaultValue, ...props }, ref) => {
    const currentValue = props.value ?? defaultValue ?? "";
    const [value, setValue] = useState(currentValue);
    // synchronize external value with local one when changed
    useEffect(() => setValue(currentValue), [currentValue]);

    const handleValueChange = useCallback(async (value: string) => {
      await interactionResponse();
      setValue(value);
    }, []);

    return (
      <Root
        ref={ref}
        {...props}
        value={value}
        onValueChange={handleValueChange}
      />
    );
  }
);

export const TabsList = List;

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  Omit<ComponentPropsWithoutRef<typeof Trigger>, "value"> & { value?: string }
>(({ value, ...props }, ref) => {
  const index = getIndexWithinAncestorFromProps(props);
  return <Trigger ref={ref} value={value ?? index ?? ""} {...props} />;
});

export const TabsContent = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof Content>, "value"> & { value?: string }
>(({ value, ...props }, ref) => {
  const index = getIndexWithinAncestorFromProps(props);
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
