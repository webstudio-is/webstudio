/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  splitPropsWithWebstudioAttributes,
  type WebstudioAttributes,
  type WebstudioComponentProps,
} from "@webstudio-is/react-sdk";

import {
  forwardRef,
  type ElementRef,
  type ComponentPropsWithoutRef,
  Children,
  type ReactNode,
  type ReactElement,
} from "react";

/**
 * We don't have support for boolean or undefined nor in UI not at Data variables,
 * instead of binding on "open" prop we bind variable on a isOpen prop to be able to show Dialog in the builder
 **/
type BuilderDialogProps = {
  isOpen: "initial" | "open" | "closed";
};

/**
 * Dialog and DialogTrigger are HTML-less components.
 * To make them work in our system, we wrap their attributes with a div that has a display: contents property.
 *
 * These divs function like fragments, with all web studio-related attributes attached to them.
 */
const DisplayContentsStyle = { display: "contents" };

export const Dialog = forwardRef<
  ElementRef<"div">,
  WebstudioAttributes &
    ComponentPropsWithoutRef<typeof DialogPrimitive.Root> &
    BuilderDialogProps
>(({ open: openProp, isOpen, children, ...props }, ref) => {
  const [webstudioAttributes, restProps] =
    splitPropsWithWebstudioAttributes(props);

  const open =
    openProp ??
    (isOpen === "open" ? true : isOpen === "closed" ? false : undefined);

  const dialogTriggers: ReactElement[] = [];
  const dialogContent: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (child !== null && typeof child === "object" && "props" in child) {
      const instanceProps: WebstudioComponentProps = child.props;

      if (instanceProps.instance.component === "DialogTrigger") {
        dialogTriggers.push(child);
        return;
      }
    }
    dialogContent.push(child);
  });

  return (
    <div ref={ref} style={DisplayContentsStyle} {...webstudioAttributes}>
      <DialogPrimitive.Root open={open} {...restProps}>
        {dialogTriggers}
        <DialogPrimitive.Portal>{dialogContent}</DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
});

/**
 * We're not exposing the 'asChild' property for the Trigger.
 * Instead, we're enforcing 'asChild=true' for the Trigger and making it style-less.
 * This avoids situations where the Trigger inadvertently passes all styles to its child,
 * which would prevent us from displaying styles properly in the builder.
 */
export const DialogTrigger = forwardRef<
  ElementRef<"div">,
  WebstudioAttributes & { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];
  const [webstudioAttributes, restProps] =
    splitPropsWithWebstudioAttributes(props);

  return (
    <div ref={ref} style={DisplayContentsStyle} {...webstudioAttributes}>
      <DialogPrimitive.Trigger asChild={true} {...restProps}>
        {firstChild ?? <button>Add button or link</button>}
      </DialogPrimitive.Trigger>
    </div>
  );
});

export const DialogOverlay = DialogPrimitive.Overlay;

export const DialogContent = DialogPrimitive.Content;
