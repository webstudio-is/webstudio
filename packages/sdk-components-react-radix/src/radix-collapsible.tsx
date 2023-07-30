/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import {
  type ReactNode,
  type ForwardRefExoticComponent,
  type ComponentPropsWithRef,
  forwardRef,
  Children,
} from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@radix-ui/react-collapsible";
import {
  type WebstudioAttributes,
  splitPropsWithWebstudioAttributes,
} from "@webstudio-is/react-sdk";

export const RadixCollapsible: ForwardRefExoticComponent<
  Omit<ComponentPropsWithRef<typeof Collapsible>, "defaultOpen" | "asChild">
> = Collapsible;

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
export const RadixCollapsibleTrigger = forwardRef<
  HTMLDivElement,
  WebstudioAttributes & { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];
  const [webstudioAttributes, restProps] =
    splitPropsWithWebstudioAttributes(props);
  return (
    <div ref={ref} style={displayContentsStyle} {...webstudioAttributes}>
      <CollapsibleTrigger asChild={true} {...restProps}>
        {firstChild ?? <button>Add button</button>}
      </CollapsibleTrigger>
    </div>
  );
});

export const RadixCollapsibleContent: ForwardRefExoticComponent<
  Omit<ComponentPropsWithRef<typeof CollapsibleContent>, "asChild">
> = CollapsibleContent;
