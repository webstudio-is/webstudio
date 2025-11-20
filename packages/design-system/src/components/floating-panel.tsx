import {
  type ReactNode,
  type ComponentProps,
  createContext,
  type RefObject,
  useContext,
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
  placement: "left-start" | "right-start" | "bottom",
  offsetOptions: OffsetOptions
): { x: number; y: number } => {
  const triggerRect = trigger.getBoundingClientRect();
  const floatingRect = floating.getBoundingClientRect();

  const mainAxis =
    typeof offsetOptions === "number"
      ? offsetOptions
      : (offsetOptions.mainAxis ?? 0);

  let x = 0;
  let y = 0;

  if (placement === "left-start") {
    // Position to the left of the trigger, aligned with the top
    x = triggerRect.left - floatingRect.width - mainAxis;
    y = triggerRect.top;
  } else if (placement === "right-start") {
    // Position to the right of the trigger, aligned with the top
    x = triggerRect.right + mainAxis;
    y = triggerRect.top;
  } else if (placement === "bottom") {
    // Position below the trigger
    x = triggerRect.left;
    y = triggerRect.bottom + mainAxis;
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

const FloatingPanelContext = createContext<{
  container: RefObject<null | HTMLElement>;
}>({
  container: {
    current: null,
  },
});

export const FloatingPanelProvider = ({
  children,
  container,
}: {
  children: JSX.Element;
  container: RefObject<null | HTMLElement>;
}) => (
  <FloatingPanelContext.Provider value={{ container }}>
    {children}
  </FloatingPanelContext.Provider>
);

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

const defaultOffset = { mainAxis: 10 };

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
  const { container: containerRef } = useContext(FloatingPanelContext);
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(
    null
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>();
  const initialPositionRef = useRef<{ x: number; y: number }>();
  const hasSetInitialPositionRef = useRef(false);
  const currentPositionRef = useRef<{ x: number; y: number }>();

  // Wrap onOpenChange to reset position when panel closes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      hasSetInitialPositionRef.current = false;
      initialPositionRef.current = undefined;
      currentPositionRef.current = undefined;
      setPosition(undefined);
    }
    onOpenChange?.(isOpen);
  };

  // Reset position tracking when panel closes via open prop
  useLayoutEffect(() => {
    if (open === false) {
      hasSetInitialPositionRef.current = false;
      initialPositionRef.current = undefined;
      currentPositionRef.current = undefined;
      setPosition(undefined);
    }
  }, [open]);

  useLayoutEffect(() => {
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

      // Only calculate position if:
      // 1. Initial position hasn't been set yet, OR
      // 2. Content doesn't fit at current position

      const rect = contentElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      if (!hasSetInitialPositionRef.current) {
        // Calculate and store initial position only once when panel opens
        const { x, y } = computeFloatingPosition(
          triggerRef.current,
          contentElement,
          placement,
          offsetProp
        );
        initialPositionRef.current = { x, y };
        currentPositionRef.current = { x, y };
        hasSetInitialPositionRef.current = true;
        setPosition({ x, y });
      } else if (currentPositionRef.current) {
        // Check if content still fits at the CURRENT position
        const { x: currentX, y: currentY } = currentPositionRef.current;
        const wouldFitAtCurrentPosition =
          currentY >= 0 &&
          currentY + rect.height <= viewportHeight &&
          currentX >= 0 &&
          currentX + rect.width <= viewportWidth;

        if (!wouldFitAtCurrentPosition) {
          // Only recalculate if content doesn't fit at current position
          const { x, y } = computeFloatingPosition(
            triggerRef.current,
            contentElement,
            placement,
            offsetProp
          );
          currentPositionRef.current = { x, y };
          // Only update if position actually changed
          setPosition((current) => {
            if (current && current.x === x && current.y === y) {
              return current;
            }
            return { x, y };
          });
        }
      }
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
