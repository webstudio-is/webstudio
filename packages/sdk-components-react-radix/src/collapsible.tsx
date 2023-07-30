/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import {
  type ReactNode,
  type ForwardRefExoticComponent,
  type ComponentPropsWithRef,
  forwardRef,
  Children,
} from "react";
import { Root, Trigger, Content } from "@radix-ui/react-collapsible";
import {
  type WebstudioAttributes,
  splitPropsWithWebstudioAttributes,
} from "@webstudio-is/react-sdk";

export const Collapsible: ForwardRefExoticComponent<
  Omit<ComponentPropsWithRef<typeof Root>, "defaultOpen" | "asChild">
> = Root;

/**
 * CollapsibleTrigger is HTML-less components.
 * To make them work in our system, we wrap their attributes with a div that has a display: contents property.
 *
 * These divs function like fragments, with all web studio-related attributes attached to them.
 */
const displayContentsStyle = { display: "contents" };

/**
 * We're not exposing the 'asChild' property for the Trigger.
 * Instead, we're enforcing 'asChild=true' for the Trigger and making it style-less.
 * This avoids situations where the Trigger inadvertently passes all styles to its child,
 * which would prevent us from displaying styles properly in the builder.
 */
export const CollapsibleTrigger = forwardRef<
  HTMLDivElement,
  WebstudioAttributes & { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];
  const [webstudioAttributes, restProps] =
    splitPropsWithWebstudioAttributes(props);
  return (
    <div ref={ref} style={displayContentsStyle} {...webstudioAttributes}>
      <Trigger asChild={true} {...restProps}>
        {firstChild ?? <button>Add button</button>}
      </Trigger>
    </div>
  );
});

export const CollapsibleContent: ForwardRefExoticComponent<
  Omit<ComponentPropsWithRef<typeof Content>, "asChild">
> = Content;
