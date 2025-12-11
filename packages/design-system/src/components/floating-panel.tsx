import {
  type ReactNode,
  type ComponentProps,
  useState,
  useRef,
  useLayoutEffect,
} from "react";
import { css, theme } from "../stitches.config";
import {
  Dialog,
  DialogTitleActions,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogMaximize,
} from "./dialog";

type OffsetOptions =
  | number
  | { mainAxis?: number; crossAxis?: number; alignmentAxis?: number | null };

const computeFloatingPosition = (
  trigger: HTMLElement,
  floating: HTMLElement,
  container: HTMLElement,
  placement: "left-start" | "right-start" | "bottom",
  offsetOptions: OffsetOptions
): { x: number; y: number } => {
  const triggerRect = trigger.getBoundingClientRect();
  const floatingRect = floating.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  console.log("computeFloatingPosition called", {
    placement,
    triggerRect,
    floatingRect,
    containerRect,
    offsetOptions,
  });

  const mainAxis =
    typeof offsetOptions === "number"
      ? offsetOptions
      : (offsetOptions.mainAxis ?? 0);
  const crossAxis =
    typeof offsetOptions === "number" ? 0 : (offsetOptions.crossAxis ?? 0);
  const alignmentAxis =
    typeof offsetOptions === "number"
      ? null
      : (offsetOptions.alignmentAxis ?? null);

  let x = 0;
  let y = 0;

  if (placement === "left-start") {
    // Position to the left of the container, aligned with the top of trigger
    // Panel's right edge should touch container's left edge
    x = containerRect.left - floatingRect.width - mainAxis;
    y = triggerRect.top + (alignmentAxis ?? 0);
    // Apply crossAxis offset (moves vertically)
    y += crossAxis;
    console.log("left-start calculation", {
      "containerRect.left": containerRect.left,
      "floatingRect.width": floatingRect.width,
      mainAxis,
      calculatedX: x,
      "panel right edge": x + floatingRect.width,
      "should equal containerRect.left": containerRect.left,
      "triggerRect.top": triggerRect.top,
      alignmentAxis,
      crossAxis,
      calculatedY: y,
    });
  } else if (placement === "right-start") {
    // Position to the right of the container, aligned with the top of trigger
    x = containerRect.right + mainAxis;
    y = triggerRect.top + (alignmentAxis ?? 0);
    // Apply crossAxis offset (moves vertically)
    y += crossAxis;
    console.log("right-start calculation", {
      "containerRect.right": containerRect.right,
      mainAxis,
      calculatedX: x,
      "triggerRect.top": triggerRect.top,
      alignmentAxis,
      crossAxis,
      calculatedY: y,
    });
  } else if (placement === "bottom") {
    // Position below the trigger
    x = triggerRect.left + (alignmentAxis ?? 0);
    y = triggerRect.bottom + mainAxis;
    // Apply crossAxis offset (moves horizontally)
    x += crossAxis;
    console.log("bottom calculation", {
      "triggerRect.left": triggerRect.left,
      alignmentAxis,
      crossAxis,
      calculatedX: x,
      "triggerRect.bottom": triggerRect.bottom,
      mainAxis,
      calculatedY: y,
    });
  }

  const beforeAdjustment = { x, y };

  // Keep within viewport bounds (simple shift)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  console.log("before viewport adjustment", {
    x,
    y,
    viewportWidth,
    viewportHeight,
  });

  // Adjust horizontal position if needed
  if (x < 0) {
    x = 0;
  } else if (x + floatingRect.width > viewportWidth) {
    x = viewportWidth - floatingRect.width;
  }

  // Adjust vertical position if needed
  if (y < 0) {
    y = 0;
  } else if (y + floatingRect.height > viewportHeight) {
    y = viewportHeight - floatingRect.height;
  }

  console.log("after viewport adjustment", {
    beforeAdjustment,
    afterAdjustment: { x, y },
    wasAdjusted: beforeAdjustment.x !== x || beforeAdjustment.y !== y,
  });

  return { x, y };
};

const contentFitsAtPosition = (
  contentElement: HTMLElement,
  position: { x: number; y: number }
): boolean => {
  const rect = contentElement.getBoundingClientRect();
  const { x, y } = position;
  return (
    y >= 0 &&
    y + rect.height <= window.innerHeight &&
    x >= 0 &&
    x + rect.width <= window.innerWidth
  );
};

type FloatingPanelProps = {
  title: ReactNode;
  content: ReactNode;
  children: ReactNode;
  titleSuffix?: ReactNode;
  maximizable?: boolean;
  resize?: ComponentProps<typeof Dialog>["resize"];
  width?: number;
  height?: number;
  // - bottom - below the trigger button
  // - left-start - on the left side relative to the container, aligned with the top of the trigger button
  // - center - center of the screen
  placement?: "left-start" | "right-start" | "center" | "bottom";
  offset?: OffsetOptions;
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
};

const contentStyle = css({
  width: theme.sizes.sidebarWidth,
});

const defaultOffset: OffsetOptions = { mainAxis: 0, crossAxis: 0 };

export const FloatingPanel = ({
  title,
  content,
  children,
  titleSuffix,
  resize,
  maximizable,
  width,
  height,
  placement = "left-start",
  offset: offsetProp = defaultOffset,
  open,
  onOpenChange,
}: FloatingPanelProps) => {
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(
    null
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>();
  const currentPositionRef = useRef<{ x: number; y: number }>();
  const containerRef = useRef<HTMLElement | null>(null);

  // Wrap onOpenChange to reset position when panel closes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      currentPositionRef.current = undefined;
      setPosition(undefined);
      containerRef.current = null;
    }
    onOpenChange?.(isOpen);
  };

  // Reset position tracking when panel closes via open prop
  useLayoutEffect(() => {
    if (open === false) {
      currentPositionRef.current = undefined;
      setPosition(undefined);
      containerRef.current = null;
    }
  }, [open]);

  useLayoutEffect(() => {
    // Find container when trigger is available and panel is opening
    if (triggerRef.current && open && !containerRef.current) {
      const container = triggerRef.current.closest(
        "[data-floating-panel-container]"
      ) as HTMLElement | null;
      console.log("Found container:", container);
      if (container) {
        const rect = container.getBoundingClientRect();
        console.log("Container position:", {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          x: rect.x,
          "viewport width": window.innerWidth,
          "is on right side": rect.right > window.innerWidth / 2,
        });
        container.setAttribute("data-dialog-boundary", "");
      }
      containerRef.current = container;
    }

    // Cleanup boundary attribute when panel closes
    if (open === false && containerRef.current) {
      containerRef.current.removeAttribute("data-dialog-boundary");
    }

    if (
      triggerRef.current === null ||
      containerRef.current === null ||
      contentElement === null ||
      // When centering the dialog, we don't need to calculate the position
      placement === "center" ||
      // Don't recalculate position when panel is closed
      open === false
    ) {
      return;
    }

    const updatePosition = () => {
      if (
        triggerRef.current === null ||
        containerRef.current === null ||
        contentElement === null
      ) {
        console.log("updatePosition: refs not ready", {
          trigger: triggerRef.current,
          container: containerRef.current,
          contentElement,
        });
        return;
      }

      console.log("updatePosition: starting", {
        hasCurrentPosition: !!currentPositionRef.current,
        placement,
        offsetProp,
      });

      // Set initial position once when panel opens
      if (!currentPositionRef.current) {
        console.log("updatePosition: calculating initial position");
        const { x, y } = computeFloatingPosition(
          triggerRef.current,
          contentElement,
          containerRef.current,
          placement,
          offsetProp
        );
        currentPositionRef.current = { x, y };
        console.log("updatePosition: setting initial position", { x, y });
        setPosition({ x, y });
        return;
      }

      // Only recalculate if content doesn't fit at current position
      const fits = contentFitsAtPosition(
        contentElement,
        currentPositionRef.current
      );
      console.log("updatePosition: checking if content fits", {
        currentPosition: currentPositionRef.current,
        fits,
      });

      if (fits) {
        console.log("updatePosition: content fits, not recalculating");
        return;
      }

      console.log("updatePosition: content doesn't fit, recalculating");
      const { x, y } = computeFloatingPosition(
        triggerRef.current,
        contentElement,
        containerRef.current,
        placement,
        offsetProp
      );
      currentPositionRef.current = { x, y };

      // Only update state if position actually changed
      setPosition((current) => {
        if (current && current.x === x && current.y === y) {
          console.log("updatePosition: position unchanged", { x, y });
          return current;
        }
        console.log("updatePosition: updating position", {
          from: current,
          to: { x, y },
        });
        return { x, y };
      });
    };

    // Calculate initial position or check if it still fits
    updatePosition();

    // Observe content size changes and update position
    const resizeObserver = new ResizeObserver(() => {
      updatePosition();
    });

    resizeObserver.observe(contentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [contentElement, containerRef, placement, offsetProp, open]);

  return (
    <Dialog
      draggable
      resize={resize}
      open={open}
      modal={false}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger asChild ref={triggerRef}>
        {children}
      </DialogTrigger>
      <DialogContent
        className={contentStyle()}
        width={width}
        height={height}
        {...position}
        aria-describedby={undefined}
        onInteractOutside={(event) => {
          // When a dialog is centered, we don't want to close it when clicking outside
          // This allows having inline and left positioned dialogs open at the same time as a centered dialog,
          // while not allowing having multiple non-center positioned dialogs open at the same time.
          if (placement === "center") {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (event.target instanceof HTMLInputElement) {
            event.preventDefault();

            return;
          }
        }}
        ref={setContentElement}
      >
        {content}
        {typeof title === "string" ? (
          <DialogTitle
            suffix={
              <DialogTitleActions>
                {titleSuffix}
                {maximizable && <DialogMaximize />}
                <DialogClose />
              </DialogTitleActions>
            }
          >
            {title}
          </DialogTitle>
        ) : (
          title
        )}
      </DialogContent>
    </Dialog>
  );
};
