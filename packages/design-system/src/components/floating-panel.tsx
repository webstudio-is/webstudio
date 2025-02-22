import {
  type ReactNode,
  type ComponentProps,
  createContext,
  type RefObject,
  useContext,
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
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
import {
  computePosition,
  flip,
  offset,
  shift,
  type OffsetOptions,
} from "@floating-ui/dom";

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

export const FloatingPanel = ({
  title,
  content,
  children,
  resize,
  maximizable,
  width,
  height,
  placement = "left-start",
  offset: offsetProp = { mainAxis: 10 },
  open,
  onOpenChange,
}: FloatingPanelProps) => {
  const { container: containerRef } = useContext(FloatingPanelContext);
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(
    null
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>();
  const positionIsSetRef = useRef(false);

  const calcPosition = useCallback(() => {
    if (
      triggerRef.current === null ||
      containerRef.current === null ||
      contentElement === null ||
      // When centering the dialog, we don't need to calculate the position
      placement === "center" ||
      // After we positioned it once, we leave it alone to avoid jumps when user is scrolling the trigger
      positionIsSetRef.current
    ) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    const anchor = {
      getBoundingClientRect() {
        return {
          width: containerRect.width,
          height: triggerRect.height,
          x: containerRect.x,
          y: triggerRect.y,
          left: containerRect.left,
          right: containerRect.right,
          top: triggerRect.top,
          bottom: triggerRect.bottom,
        };
      },
    };

    computePosition(anchor, contentElement, {
      placement,
      middleware: [
        shift(),
        placement === "bottom" && flip(),
        offset(offsetProp),
      ],
    }).then(({ x, y }) => {
      setPosition({ x, y });
      positionIsSetRef.current = true;
    });
  }, [
    positionIsSetRef,
    contentElement,
    triggerRef,
    containerRef,
    placement,
    offsetProp,
  ]);

  useLayoutEffect(calcPosition, [calcPosition]);

  return (
    <Dialog
      draggable
      resize={resize}
      open={open}
      modal={false}
      onOpenChange={onOpenChange}
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
