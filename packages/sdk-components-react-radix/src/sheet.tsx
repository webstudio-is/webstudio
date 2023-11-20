import {
  forwardRef,
  type ElementRef,
  type ComponentPropsWithoutRef,
} from "react";
import { getClosestInstance, type Hook } from "@webstudio-is/react-sdk";
import * as Dialog from "./dialog";

export const Sheet = Dialog.Dialog;
export const SheetTrigger = Dialog.DialogTrigger;
export const SheetOverlay = Dialog.DialogOverlay;
export const SheetClose = Dialog.DialogClose;
export const SheetTitle = Dialog.DialogTitle;
export const SheetDescription = Dialog.DialogDescription;

// eslint-disable-next-line react/display-name
export const SheetContent = forwardRef<
  ElementRef<"div">,
  ComponentPropsWithoutRef<typeof Dialog.DialogContent> & {
    tag?: "div" | "nav";
    side?: "top" | "right" | "bottom" | "left";
  }
>(
  (
    { tag = "nav", side = "left", role = "navigation", children, ...props },
    ref
  ) => {
    // Do not do this at args like { tag: Tag = "nav" }, generate-arg-types will not find defaultValue in that case
    const Tag = tag;
    return (
      <Dialog.DialogContent
        asChild={true}
        data-side={side}
        role={role}
        {...props}
      >
        <Tag ref={ref}>{children}</Tag>
      </Dialog.DialogContent>
    );
  }
);

/* BUILDER HOOKS */

const namespace = "@webstudio-is/sdk-components-react-radix";

// For each SheetOverlay component within the selection,
// we identify its closest parent Sheet component
// and update its open prop bound to variable.
export const hooksSheet: Hook = {
  onNavigatorUnselect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:SheetOverlay`) {
        const sheet = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Sheet`
        );
        if (sheet) {
          context.setPropVariable(sheet.id, "open", false);
        }
      }
    }
  },
  onNavigatorSelect: (context, event) => {
    for (const instance of event.instancePath) {
      if (instance.component === `${namespace}:SheetOverlay`) {
        const sheet = getClosestInstance(
          event.instancePath,
          instance,
          `${namespace}:Sheet`
        );
        if (sheet) {
          context.setPropVariable(sheet.id, "open", true);
        }
      }
    }
  },
};
