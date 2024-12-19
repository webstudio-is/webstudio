import {
  type ReactNode,
  type ForwardRefExoticComponent,
  forwardRef,
  Children,
  type ComponentProps,
  type RefAttributes,
} from "react";
import { Root, Trigger, Content } from "@radix-ui/react-collapsible";
import { type Hook, getClosestInstance } from "@webstudio-is/react-sdk/runtime";

export const Collapsible: ForwardRefExoticComponent<
  Omit<ComponentProps<typeof Root>, "defaultOpen" | "asChild"> &
    RefAttributes<HTMLDivElement>
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
  Omit<ComponentProps<typeof Content>, "asChild"> &
    RefAttributes<HTMLDivElement>
> = Content;

/* BUILDER HOOKS */

const namespace = "@webstudio-is/sdk-components-react-radix";

// For each CollapsibleContent component within the selection,
// we identify its closest parent Collapsible component
// and update its open prop bound to variable.
export const hooksCollapsible: Hook = {
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:CollapsibleContent`) {
        const collapsible = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Collapsible`
        );
        if (collapsible) {
          context.setMemoryProp(collapsible, "open", true);
        }
      }
    }
  },
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:CollapsibleContent`) {
        const collapsible = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Collapsible`
        );
        if (collapsible) {
          context.setMemoryProp(collapsible, "open", undefined);
        }
      }
    }
  },
};
