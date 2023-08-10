/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  Children,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { getClosestInstance, type Hook } from "@webstudio-is/react-sdk";

// wrap in forwardRef because Root is functional component without ref
export const Dialog = forwardRef<
  HTMLDivElement,
  Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Root>, "defaultOpen">
>((props, _ref) => {
  return <DialogPrimitive.Root {...props} />;
});

/**
 * We're not exposing the 'asChild' property for the Trigger.
 * Instead, we're enforcing 'asChild=true' for the Trigger and making it style-less.
 * This avoids situations where the Trigger inadvertently passes all styles to its child,
 * which would prevent us from displaying styles properly in the builder.
 */
export const DialogTrigger = forwardRef<
  HTMLButtonElement,
  { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];

  return (
    <DialogPrimitive.Trigger ref={ref} asChild={true} {...props}>
      {firstChild ?? <button>Add button or link</button>}
    </DialogPrimitive.Trigger>
  );
});

export const DialogOverlay = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>((props, ref) => {
  return (
    <DialogPrimitive.DialogPortal>
      <DialogPrimitive.Overlay ref={ref} {...props} />
    </DialogPrimitive.DialogPortal>
  );
});

export const DialogContent = DialogPrimitive.Content;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

/* BUILDER HOOKS */

const namespace = "@webstudio-is/sdk-components-react-radix";

// For each DialogOverlay component within the selection,
// we identify its closest parent Dialog component
// and update its open prop bound to variable.
export const hooksDialog: Hook = {
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:DialogOverlay`) {
        const dialog = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Dialog`
        );
        if (dialog) {
          context.setPropVariable(dialog.id, "open", false);
        }
      }
    }
  },
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:DialogOverlay`) {
        const dialog = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Dialog`
        );
        if (dialog) {
          context.setPropVariable(dialog.id, "open", true);
        }
      }
    }
  },
};
