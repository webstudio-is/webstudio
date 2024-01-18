import {
  type ReactNode,
  type ComponentProps,
  type Ref,
  forwardRef,
} from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { css, theme, keyframes, type CSS } from "../stitches.config";
import { PanelTitle } from "./panel-title";
import { floatingPanelStyle, CloseButton, TitleSlot } from "./floating-panel";

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;

// Wrap a close button with this
// https://www.radix-ui.com/docs/primitives/components/dialog#close
export const DialogClose = Primitive.Close;

// An optional accessible description to be announced when the dialog is opened
// https://www.radix-ui.com/docs/primitives/components/dialog#description
export const DialogDescription = Primitive.Description;

export const DialogContent = forwardRef(
  (
    {
      children,
      className,
      css,
      overlayCss,
      ...props
    }: ComponentProps<typeof Primitive.Content> & {
      css?: CSS;
      overlayCss?: CSS;
    },
    forwardedRef: Ref<HTMLDivElement>
  ) => {
    return (
      <Primitive.Portal>
        <Primitive.Overlay
          className={overlayStyle({
            css: { zIndex: css?.zIndex, ...overlayCss },
          })}
        />
        <Primitive.Content
          className={contentStyle({ className, css })}
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
    <PanelTitle
      suffix={
        <Primitive.Close asChild>
          <CloseButton aria-label={closeLabel} />
        </Primitive.Close>
      }
    >
      <Primitive.Title className={titleStyle()}>{children}</Primitive.Title>
    </PanelTitle>
  </TitleSlot>
);

// Styles specific to dialog
// (as opposed to be common for all floating panels)

const overlayShow = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});
const overlayStyle = css({
  backgroundColor: "rgba(17, 24, 28, 0.66)",
  position: "fixed",
  inset: 0,
  animation: `${overlayShow} 150ms ${theme.easing.easeOut}`,
});

const contentShow = keyframes({
  from: { opacity: 0, transform: "translate(-50%, -48%) scale(0.96)" },
  to: { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
});
const contentStyle = css(floatingPanelStyle, {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "min-content",
  minWidth: theme.spacing[30],
  maxWidth: theme.spacing[35],
  maxHeight: "85vh",
  animation: `${contentShow} 150ms ${theme.easing.easeOut}`,
});

const titleStyle = css({
  // Resetting H2 styles (Primitive.Title is H2)
  all: "unset",
});
