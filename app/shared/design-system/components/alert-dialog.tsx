import React from "react";
import { styled } from "../stitches.config";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { overlayStyles } from "./overlay";
import { panelStyles } from "./panel";

type AlertDialogProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Root
> & {
  children: React.ReactNode;
};

const StyledOverlay = styled(AlertDialogPrimitive.Overlay, overlayStyles, {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

export const AlertDialog = ({ children, ...props }: AlertDialogProps) => {
  return (
    <AlertDialogPrimitive.Root {...props}>
      <StyledOverlay />
      {children}
    </AlertDialogPrimitive.Root>
  );
};

export const AlertDialogContent = styled(
  AlertDialogPrimitive.Content,
  panelStyles,
  {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    minWidth: 200,
    maxHeight: "85vh",
    padding: "$4",
    marginTop: "-5vh",

    "&:focus": {
      outline: "none",
    },
  }
);

export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogTitle = AlertDialogPrimitive.Title;
export const AlertDialogDescription = AlertDialogPrimitive.Description;
export const AlertDialogAction = AlertDialogPrimitive.Action;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
