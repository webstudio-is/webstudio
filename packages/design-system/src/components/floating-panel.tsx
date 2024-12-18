import {
  type ReactNode,
  type ComponentProps,
  createContext,
  type RefObject,
  useContext,
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
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
import { clamp } from "@react-aria/utils";

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
  resize?: ComponentProps<typeof DialogContent>["resize"];
  width?: number;
  height?: number;
  offset?: {
    x?: number;
    y?: number;
  };
  // - inline - aligns the dialog above the container like left or right sidebar
  // - left - aligns the dialog on the left side of the container
  // - center - aligns the dialog in the center of the screen
  position?: "left" | "center" | "inline";
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
  position = "left",
  offset = { x: 0, y: 10 },
  open,
  onOpenChange,
}: FloatingPanelProps) => {
  const { container: containerRef } = useContext(FloatingPanelContext);
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(
    null
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [x, setX] = useState<number>();
  const [y, setY] = useState<number>();

  const calcPosition = useCallback(() => {
    if (
      triggerRef.current === null ||
      containerRef.current === null ||
      contentElement === null ||
      // When centering the dialog, we don't need to calculate the position
      position === "center"
    ) {
      return;
    }
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let newX = 0;
    switch (position) {
      case "left":
        // Position it on the left side relative to the container
        newX =
          windowWidth -
          containerRect.width -
          contentRect.width +
          (offset.x ?? 0);
        break;
      case "inline":
        // Positions it above the container
        newX = windowWidth - contentRect.width + (offset.x ?? 0);
        break;
      // @todo add right once needed
    }
    const maxX = windowWidth - contentRect.width;
    setX(clamp(newX, 0, maxX));

    const newY = triggerRect.bottom + (offset.y ?? 0);
    const maxY = windowHeight - contentRect.height;
    setY(clamp(newY, 0, maxY));
  }, [contentElement, triggerRef, containerRef, position, offset.y, offset.x]);

  const adjustPositionForCollision = useCallback(() => {
    if (contentElement === null || position === "center") {
      return;
    }
    const contentRect = contentElement.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const maxY = windowHeight - contentRect.height;
    setY(clamp(y ?? 0, 0, maxY));
    // @todo add this for x when needed
  }, [contentElement, y, position]);

  useLayoutEffect(calcPosition, [calcPosition]);

  // When content changes in height, it can get cut off by the viewport size.
  // In this case we adjust the position.
  useEffect(() => {
    if (contentElement === null) {
      return;
    }
    const observer = new ResizeObserver(adjustPositionForCollision);
    observer.observe(contentElement);
    return () => {
      observer.disconnect();
    };
  }, [contentElement, adjustPositionForCollision]);

  return (
    <Dialog open={open} modal={false} onOpenChange={onOpenChange}>
      <DialogTrigger asChild ref={triggerRef}>
        {children}
      </DialogTrigger>
      <DialogContent
        draggable
        resize={resize}
        className={contentStyle()}
        width={width}
        height={height}
        x={x}
        y={y}
        onInteractOutside={(event) => {
          event.preventDefault();
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
