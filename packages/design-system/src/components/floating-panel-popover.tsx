import React, { type ComponentProps, type Ref, type ReactNode } from "react";
import * as Primitive from "@radix-ui/react-popover";
import { css, theme, type CSS } from "../stitches.config";
import { Title } from "./title";
import { floatingPanelStyle, CloseButton, TitleSlot } from "./floating-panel";

export const FloatingPanelPopover = Primitive.Root;

const contentStyle = css(floatingPanelStyle, {
  minWidth: theme.spacing[28],
  maxWidth: "max-content",
  maxHeight: "80vh",
  overflowY: "auto",
});

export const FloatingPanelPopoverContent = React.forwardRef(
  (
    {
      children,
      className,
      css,
      ...props
    }: ComponentProps<typeof Primitive.Content> & { css?: CSS },
    ref: Ref<HTMLDivElement>
  ) => (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={4}
        collisionPadding={4}
        className={contentStyle({ className, css })}
        {...props}
        ref={ref}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  )
);
FloatingPanelPopoverContent.displayName = "FloatingPanelPopoverContent";

export const FloatingPanelPopoverTitle = ({
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
      {children}
    </Title>
  </TitleSlot>
);

export const FloatingPanelPopoverTrigger = Primitive.Trigger;
export const FloatingPanelPopoverClose = Primitive.Close;
export const FloatingPanelAnchor = Primitive.Anchor;
