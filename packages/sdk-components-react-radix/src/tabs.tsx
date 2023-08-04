/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type ComponentPropsWithRef,
  type ReactNode,
  forwardRef,
  Children,
} from "react";
import { Root, List, Trigger, Content } from "@radix-ui/react-tabs";
import { getIndexWithinAncestorFromComponentProps } from "@webstudio-is/react-sdk";

export const Tabs: ForwardRefExoticComponent<
  Omit<ComponentPropsWithRef<typeof Root>, "asChild" | "defaultValue">
> = Root;

export const TabsList = List;

/**
 * We're not exposing the 'asChild' property for the Trigger.
 * Instead, we're enforcing 'asChild=true' for the Trigger and making it style-less.
 * This avoids situations where the Trigger inadvertently passes all styles to its child,
 * which would prevent us from displaying styles properly in the builder.
 */
export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  { value: string; children: ReactNode }
>(({ value, children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];
  const index = getIndexWithinAncestorFromComponentProps(props);
  return (
    <Trigger ref={ref} value={value ?? index} asChild={true} {...props}>
      {firstChild ?? <button>Add button</button>}
    </Trigger>
  );
});

export const TabsContent = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof Content>, "asChild">
>(({ value, ...props }, ref) => {
  const index = getIndexWithinAncestorFromComponentProps(props);
  return <Content ref={ref} value={value ?? index} {...props} />;
});
