import * as React from "react";
import { styled, CSS } from "../stitches.config";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CrossIcon } from "@webstudio-is/icons";
import { overlayStyles } from "./overlay";
import { panelStyles } from "./panel";
import { IconButtonDeprecated } from "./icon-button-deprecated";

type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root> & {
  children: React.ReactNode;
};

const StyledOverlay = styled(DialogPrimitive.Overlay, overlayStyles, {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: "$1",
});

export const Dialog = ({ children, ...props }: DialogProps) => {
  return (
    <DialogPrimitive.Root {...props}>
      <StyledOverlay />
      {children}
    </DialogPrimitive.Root>
  );
};

const StyledContent = styled(DialogPrimitive.Content, panelStyles, {
  position: "fixed",
  zIndex: "$1",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  minWidth: 200,
  maxHeight: "85vh",
  padding: "$spacing$10",
  marginTop: "-5vh",
  // animation: `${fadeIn} 125ms linear, ${moveDown} 125ms cubic-bezier(0.22, 1, 0.36, 1)`,

  // Among other things, prevents text alignment inconsistencies when dialog can't be centered in the viewport evenly.
  // Affects animated and non-animated dialogs alike.
  willChange: "transform",

  "&:focus": {
    outline: "none",
  },
});

const StyledCloseButton = styled(DialogPrimitive.Close, {
  position: "absolute",
  top: "$spacing$5",
  right: "$spacing$5",
});

type DialogContentPrimitiveProps = React.ComponentProps<
  typeof DialogPrimitive.Content
>;
type DialogContentProps = DialogContentPrimitiveProps & { css?: CSS };

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof StyledContent>,
  DialogContentProps
>(({ children, ...props }, forwardedRef) => (
  <StyledContent {...props} ref={forwardedRef}>
    {children}
    <StyledCloseButton asChild>
      <IconButtonDeprecated>
        <CrossIcon />
      </IconButtonDeprecated>
    </StyledCloseButton>
  </StyledContent>
));
DialogContent.displayName = "DialogContent";

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogPortal = DialogPrimitive.Portal;
