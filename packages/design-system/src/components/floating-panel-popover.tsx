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

import { type RefObject, useRef, useState, useLayoutEffect } from "react";

/**
 * @deprecated migrating to FloatingPanel
 */
export const useSideOffset = ({
  side = "left",
  isOpen,
  containerRef,
}: {
  side?: "left" | "right";
  isOpen: boolean;
  containerRef?: RefObject<null | HTMLElement>;
}): [RefObject<HTMLButtonElement>, number] => {
  const triggerRef = useRef<null | HTMLButtonElement>(null);
  const [sideOffset, setSideOffset] = useState(0);

  // use layout effect to avoid popover jumping
  useLayoutEffect(() => {
    if (
      isOpen === false ||
      containerRef === undefined ||
      containerRef.current === null ||
      triggerRef.current === null
    ) {
      // Prevent computation if the panel is closed
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const triggerRect = triggerRef.current.getBoundingClientRect();
    if (side === "left") {
      setSideOffset(triggerRect.left - containerRect.left);
    }
    if (side === "right") {
      const containerRight = containerRect.left + containerRect.width;
      const triggerRight = triggerRect.left + triggerRect.width;
      setSideOffset(containerRight - triggerRight);
    }
  }, [side, isOpen, containerRef]);

  return [triggerRef, sideOffset];
};

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
