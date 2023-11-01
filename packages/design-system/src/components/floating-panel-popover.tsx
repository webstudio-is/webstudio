import {
  type ComponentProps,
  type Ref,
  type ReactNode,
  forwardRef,
} from "react";
import * as Primitive from "@radix-ui/react-popover";
import { css, theme, type CSS } from "../stitches.config";
import { PanelTitle } from "./panel-title";
import { floatingPanelStyle, CloseButton, TitleSlot } from "./floating-panel";

export const FloatingPanelPopover = Primitive.Root;

const contentStyle = css(floatingPanelStyle, {
  minWidth: theme.spacing[28],
  maxWidth: "max-content",
  maxHeight: "80vh",
  overflowY: "auto",
});

export const FloatingPanelPopoverContent = forwardRef(
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
  actions,
  closeLabel = "Close dialog",
}: {
  children: ReactNode;
  actions?: ReactNode;
  closeLabel?: string;
}) => (
  <TitleSlot>
    <PanelTitle
      suffix={
        <>
          {actions}
          <Primitive.Close asChild>
            <CloseButton aria-label={closeLabel} />
          </Primitive.Close>
        </>
      }
    >
      {children}
    </PanelTitle>
  </TitleSlot>
);

export const FloatingPanelPopoverTrigger = Primitive.Trigger;
export const FloatingPanelPopoverClose = Primitive.Close;
export const FloatingPanelAnchor = Primitive.Anchor;
