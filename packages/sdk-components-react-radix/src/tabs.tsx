/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type ComponentPropsWithRef,
  forwardRef,
  Children,
} from "react";
import { Root, List, Trigger, Content } from "@radix-ui/react-tabs";
import {
  type WebstudioAttributes,
  getIndexWithinAncestorFromComponentProps,
  splitPropsWithWebstudioAttributes,
} from "@webstudio-is/react-sdk";

/**
 * TabsTrigger is HTML-less components.
 * To make them work in our system, we wrap their attributes with a div that has a display: contents property.
 *
 * These divs function like fragments, with all web studio-related attributes attached to them.
 */
const displayContentsStyle = { display: "contents" };

export const Tabs: ForwardRefExoticComponent<
  WebstudioAttributes &
    Omit<ComponentPropsWithRef<typeof Root>, "asChild" | "defaultValue">
> = Root;

export const TabsList = List;

export const TabsTrigger = forwardRef<
  HTMLDivElement,
  WebstudioAttributes &
    Omit<ComponentPropsWithoutRef<typeof Trigger>, "asChild">
>(({ value, children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];
  const [webstudioAttributes, restProps] =
    splitPropsWithWebstudioAttributes(props);
  const index = getIndexWithinAncestorFromComponentProps(props);
  return (
    <div ref={ref} style={displayContentsStyle} {...webstudioAttributes}>
      <Trigger value={value ?? index} asChild={true} {...restProps}>
        {firstChild ?? <button>Add button</button>}
      </Trigger>
    </div>
  );
});

export const TabsContent = forwardRef<
  HTMLDivElement,
  WebstudioAttributes &
    Omit<ComponentPropsWithoutRef<typeof Content>, "asChild">
>(({ value, ...props }, ref) => {
  const index = getIndexWithinAncestorFromComponentProps(props);
  return <Content ref={ref} value={value ?? index} {...props} />;
});
