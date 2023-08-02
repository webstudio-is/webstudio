import {
  forwardRef,
  type ElementRef,
  type ComponentPropsWithoutRef,
} from "react";
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
>(({ tag: Tag = "nav", side = "left", children, ...props }, ref) => {
  return (
    <Dialog.DialogContent
      asChild={true}
      role="navigation"
      data-side={side}
      {...props}
    >
      <Tag ref={ref}>{children}</Tag>
    </Dialog.DialogContent>
  );
});
