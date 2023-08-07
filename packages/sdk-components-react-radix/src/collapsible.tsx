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

export const Collapsible: ForwardRefExoticComponent<
  Omit<ComponentPropsWithRef<typeof Root>, "defaultOpen" | "asChild">
> = Root;

/**
 * We're not exposing the 'asChild' property for the Trigger.
 * Instead, we're enforcing 'asChild=true' for the Trigger and making it style-less.
 * This avoids situations where the Trigger inadvertently passes all styles to its child,
 * which would prevent us from displaying styles properly in the builder.
 */
export const CollapsibleTrigger = forwardRef<
  HTMLButtonElement,
  { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];
  return (
    <Trigger asChild={true} ref={ref} {...props}>
      {firstChild ?? <button>Add button</button>}
    </Trigger>
  );
});

export const CollapsibleContent: ForwardRefExoticComponent<
  Omit<ComponentPropsWithRef<typeof Content>, "asChild">
> = Content;
