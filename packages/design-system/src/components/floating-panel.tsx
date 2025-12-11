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
  placement: "left-start" | "right-start" | "bottom-within",
  offsetOptions: OffsetOptions
): { x: number; y: number } => {
  const triggerRect = trigger.getBoundingClientRect();
  const floatingRect = floating.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

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
    x = containerRect.left - floatingRect.width + mainAxis;
    // Align panel top with trigger top
    y = triggerRect.top + (alignmentAxis ?? 0);
    // Apply crossAxis offset (moves vertically)
    y += crossAxis;
  } else if (placement === "right-start") {
    // Position to the right of the container, aligned with the top of trigger
    x = containerRect.right + mainAxis;
    // Align panel top with trigger top, using trigger's relative position within container
    y = triggerRect.top + (alignmentAxis ?? 0);
    // Apply crossAxis offset (moves vertically)
    y += crossAxis;
  } else if (placement === "bottom-within") {
    // Position below the trigger, centered horizontally within the container
    // Center the panel horizontally within the container
    x =
      containerRect.left +
      (containerRect.width - floatingRect.width) / 2 +
      (alignmentAxis ?? 0);
    // Apply crossAxis offset (moves horizontally)
    x += crossAxis;
    // Y: below the trigger with 5px default offset
    y = triggerRect.bottom + (mainAxis === 0 ? 5 : mainAxis);
  }

  // Keep within viewport bounds (simple shift)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

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
  title?: ReactNode;
  content: ReactNode;
  children: ReactNode;
  titleSuffix?: ReactNode;
  maximizable?: boolean;
  resize?: ComponentProps<typeof Dialog>["resize"];
  width?: number;
  height?: number;
  // - bottom-within - below the trigger button, within container bounds
  // - left-start - on the left side relative to the container, aligned with the top of the trigger button
  // - center - center of the screen
  placement?: "left-start" | "right-start" | "center" | "bottom-within";
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
  open: openProp,
  onOpenChange,
}: FloatingPanelProps) => {
  // Support both controlled and uncontrolled modes
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;

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
    // Update internal state if uncontrolled
    if (openProp === undefined) {
      setInternalOpen(isOpen);
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
      containerRef.current = container;
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
        return;
      }

      // Set initial position once when panel opens
      if (!currentPositionRef.current) {
        const { x, y } = computeFloatingPosition(
          triggerRef.current,
          contentElement,
          containerRef.current,
          placement,
          offsetProp
        );
        currentPositionRef.current = { x, y };
        setPosition({ x, y });
        return;
      }

      // Only recalculate if content doesn't fit at current position
      const fits = contentFitsAtPosition(
        contentElement,
        currentPositionRef.current
      );

      if (fits) {
        return;
      }
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
          return current;
        }
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
        boundaryTolerance={
          placement === "bottom-within" ? { horizontal: Infinity } : undefined
        }
        aria-describedby={undefined}
        ref={setContentElement}
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
