import React, { type ReactNode, type ComponentProps, type Ref } from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { css, theme, keyframes } from "../../stitches.config";
import { Title } from "../title";
import { Separator } from "../separator";
import { floatingPanelStyles } from "./floating-panel-styles";
import { Button } from "../button";
import { CrossIcon } from "@webstudio-is/icons";

export const Root = Primitive.Root;
export const Trigger = Primitive.Trigger;

// Wrap a close button with this
// https://www.radix-ui.com/docs/primitives/components/dialog#close
export const Close = Primitive.Close;

// An optional accessible description to be announced when the dialog is opened
// https://www.radix-ui.com/docs/primitives/components/dialog#description
export const Description = Primitive.Description;

type ContentProps = ComponentProps<typeof Primitive.Content>;

export const Content = React.forwardRef(
  (
    { children, className, ...props }: ContentProps,
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
Content.displayName = "Content";

const ContentTitle = ({
  children,
  closeLabel = "Close dialog",
}: {
  children: ReactNode;
  closeLabel?: string;
}) => (
  <div className={titleSlotStyles()}>
    <Title
      suffix={
        <Primitive.Close asChild>
          <Button
            color="ghost"
            prefix={<CrossIcon />}
            aria-label={closeLabel}
          />
        </Primitive.Close>
      }
    >
      {children}
    </Title>
    <Separator />
  </div>
);
export { ContentTitle as Title };

// Styles specific to dialog (as opposed to be common for all floating panels)

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
  maxWidth: "450px",
  maxHeight: "85vh",
  animation: `${contentShow} 150ms ${theme.easing.easeOut}`,
});

// @todo: is this sepcific to Dialog?
const titleSlotStyles = css({
  // We put title at the bottom in DOM to make the close button last in the tab order
  // But visually we want it to be first
  order: -1,
});
