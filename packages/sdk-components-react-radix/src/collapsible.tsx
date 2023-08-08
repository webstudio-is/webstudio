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
import type {
  Hook,
  HookContext,
  InstanceSelector,
} from "@webstudio-is/react-sdk";

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

/* BUILDER HOOKS */

const namespace = "@webstudio-is/sdk-components-react-radix";

const onCollapsibleContentMatched = (
  context: HookContext,
  instanceSelector: InstanceSelector,
  callback: (collapsibleId: string) => void
) => {
  let isContentSelected = false;
  for (const instanceId of instanceSelector) {
    const instance = context.instances.get(instanceId);
    if (instance === undefined) {
      continue;
    }
    if (instance.component === `${namespace}:CollapsibleContent`) {
      isContentSelected = true;
    }
    if (
      instance.component === `${namespace}:Collapsible` &&
      isContentSelected
    ) {
      isContentSelected = false;
      callback(instance.id);
    }
  }
};

const findOpenPropVariableId = (context: HookContext, instanceId: string) => {
  for (const prop of context.props.values()) {
    if (
      prop.instanceId === instanceId &&
      prop.name === "open" &&
      prop.type === "dataSource"
    ) {
      return prop.value;
    }
  }
};

export const hooksCollapsible: Hook = {
  onNavigatorDeselect: (context, event) => {
    onCollapsibleContentMatched(
      context,
      event.instanceSelector,
      (collapsibleId) => {
        const variableId = findOpenPropVariableId(context, collapsibleId);
        if (variableId) {
          context.setVariable(variableId, false);
        }
      }
    );
  },
  onNavigatorSelect: (context, event) => {
    onCollapsibleContentMatched(
      context,
      event.instanceSelector,
      (collapsibleId) => {
        const variableId = findOpenPropVariableId(context, collapsibleId);
        if (variableId) {
          context.setVariable(variableId, true);
        }
      }
    );
  },
};
