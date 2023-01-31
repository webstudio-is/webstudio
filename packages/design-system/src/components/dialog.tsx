import React, { type ReactNode, type ComponentProps, type Ref } from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { css, theme, keyframes } from "../stitches.config";
import { Title } from "./title";
import { floatingPanelStyles, CloseButton, TitleSlot } from "./floating-panel";

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;

// Wrap a close button with this
// https://www.radix-ui.com/docs/primitives/components/dialog#close
export const DialogClose = Primitive.Close;

// An optional accessible description to be announced when the dialog is opened
// https://www.radix-ui.com/docs/primitives/components/dialog#description
export const DialogDescription = Primitive.Description;

export const DialogContent = React.forwardRef(
  (
    { children, className, ...props }: ComponentProps<typeof Primitive.Content>,
    forwardedRef: Ref<HTMLDivElement>
  ) => {
    return (
      <Primitive.Portal>
        <Primitive.Overlay className={overlayStyles()} />
        <Primitive.Content
          className={contentStyles({ className })}
          {...props}
          ref={forwardedRef}
        >
          {children}
        </Primitive.Content>
      </Primitive.Portal>
    );
  }
);
DialogContent.displayName = "DialogContent";

export const DialogTitle = ({
  children,
  closeLabel = "Close dialog",
}: {
  children: ReactNode;
  closeLabel?: string;
}) => (
  <TitleSlot>
    <Title
      suffix={
        <Primitive.Close asChild>
          <CloseButton aria-label={closeLabel} />
        </Primitive.Close>
      }
    >
      <Primitive.Title className={titleStyles()}>{children}</Primitive.Title>
    </Title>
  </TitleSlot>
);

// Styles specific to dialog
// (as opposed to be common for all floating panels)

const overlayShow = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});
const overlayStyles = css({
  backgroundColor: "rgba(17, 24, 28, 0.66)",
  position: "fixed",
  inset: 0,
  animation: `${overlayShow} 150ms ${theme.easing.easeOut}`,
});

const contentShow = keyframes({
  from: { opacity: 0, transform: "translate(-50%, -48%) scale(0.96)" },
  to: { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
});
const contentStyles = css(floatingPanelStyles, {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90vw",
  maxWidth: theme.spacing[35],
  maxHeight: "85vh",
  animation: `${contentShow} 150ms ${theme.easing.easeOut}`,
});

const titleStyles = css({
  // Resetting H2 styles (Primitive.Title is H2)
  all: "unset",
});
