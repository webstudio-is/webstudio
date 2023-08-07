/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import * as DialogPrimitive from "@radix-ui/react-dialog";

import {
  forwardRef,
  type ElementRef,
  type ComponentPropsWithoutRef,
  Children,
  type ReactNode,
} from "react";

/**
 * We don't have support for boolean or undefined nor in UI not at Data variables,
 * instead of binding on "open" prop we bind variable on a isOpen prop to be able to show Dialog in the builder
 **/
type BuilderDialogProps = {
  isOpen: "initial" | "open" | "closed";
};

export const Dialog = forwardRef<
  ElementRef<"div">,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Root> & BuilderDialogProps
>(({ open: openProp, isOpen, ...props }, ref) => {
  const open =
    openProp ??
    (isOpen === "open" ? true : isOpen === "closed" ? false : undefined);

  return <DialogPrimitive.Root open={open} {...props} />;
});

/**
 * We're not exposing the 'asChild' property for the Trigger.
 * Instead, we're enforcing 'asChild=true' for the Trigger and making it style-less.
 * This avoids situations where the Trigger inadvertently passes all styles to its child,
 * which would prevent us from displaying styles properly in the builder.
 */
export const DialogTrigger = forwardRef<
  ElementRef<"div">,
  { children: ReactNode }
>(({ children, ...props }, ref) => {
  const firstChild = Children.toArray(children)[0];

  return (
    <DialogPrimitive.Trigger asChild={true} {...props}>
      {firstChild ?? <button>Add button or link</button>}
    </DialogPrimitive.Trigger>
  );
});

export const DialogOverlay = forwardRef<
  ElementRef<"div">,
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
