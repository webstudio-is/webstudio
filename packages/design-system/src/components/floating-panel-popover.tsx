import {
  type ComponentProps,
  type Ref,
  type ReactNode,
  forwardRef,
} from "react";
import * as Primitive from "@radix-ui/react-popover";
import { css, theme, type CSS } from "../stitches.config";
import { Flex } from "./flex";
import { DialogClose, DialogTitle } from "./dialog";

export const FloatingPanelPopover = Primitive.Root;

const contentStyle = css({
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
}: {
  children: ReactNode;
  actions?: ReactNode;
  closeLabel?: string;
}) => (
  <DialogTitle
    suffix={
      <Flex gap={1}>
        {actions}
        <DialogClose />
      </Flex>
    }
  >
    {children}
  </DialogTitle>
);

export const FloatingPanelPopoverTrigger = Primitive.Trigger;
export const FloatingPanelPopoverClose = Primitive.Close;
export const FloatingPanelAnchor = Primitive.Anchor;
