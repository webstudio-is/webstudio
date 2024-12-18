import {
  type RefObject,
  useContext,
  useRef,
  useState,
  createContext,
  useLayoutEffect,
  type JSX,
  type ComponentProps,
  type ReactNode,
  type MutableRefObject,
} from "react";
import {
  theme,
  css,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  Flex,
  Button,
  DialogClose,
} from "@webstudio-is/design-system";
import { CrossIcon, MaximizeIcon, MinimizeIcon } from "@webstudio-is/icons";

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
  // - inline - aligns the dialog above the container like left or right sidebar
  // - leftAside - aligns the dialog on the left side of the container
  // - center - aligns the dialog in the center of the screen
  align?: "leftAside" | "center" | "inline";
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
  align = "leftAside",
  open,
  onOpenChange,
}: FloatingPanelProps) => {
  const { container: containerRef } = useContext(FloatingPanelContext);
  const [isMaximized, setIsMaximized] = useState(false);
  const contentRef: MutableRefObject<HTMLDivElement | null> = useRef(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<{
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }>({
    x: undefined,
    y: undefined,
    width,
    height,
  });

  const calcRect = () => {
    if (
      triggerRef.current === null ||
      containerRef.current === null ||
      contentRef.current === null ||
      // When centering the dialog, we don't need to calculate the position
      align === "center"
    ) {
      return;
    }
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const x =
      align === "leftAside"
        ? // Position it on the left side relative to the container
          window.innerWidth - containerRect.width - contentRect.width
        : // Positions it above the container
          window.innerWidth - containerRect.width;
    const y =
      triggerRect.y + contentRect.height > window.innerHeight
        ? window.innerHeight - contentRect.height
        : triggerRect.y;

    if (align === "inline") {
      const width = containerRect.width;
      setRect({ ...rect, x, y, width });
      return;
    }
    setRect({ ...rect, x, y });
  };

  return (
    <Dialog open={open} modal={false} onOpenChange={onOpenChange}>
      <DialogTrigger asChild ref={triggerRef}>
        {children}
      </DialogTrigger>
      <DialogContent
        draggable
        resize={resize}
        className={contentStyle()}
        {...rect}
        isMaximized={isMaximized}
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
        ref={(element) => {
          if (element !== null && contentRef.current !== element) {
            contentRef.current = element;
            calcRect();
          }
        }}
      >
        {content}
        <DialogTitle
          suffix={
            <Flex
              gap="1"
              onMouseDown={(event) => {
                // Prevent dragging dialog
                event.preventDefault();
              }}
            >
              {maximizable && (
                <Button
                  color="ghost"
                  prefix={isMaximized ? <MinimizeIcon /> : <MaximizeIcon />}
                  aria-label="Expand"
                  onClick={() => setIsMaximized(isMaximized ? false : true)}
                />
              )}
              <DialogClose asChild>
                <Button
                  color="ghost"
                  prefix={<CrossIcon />}
                  aria-label="Close"
                />
              </DialogClose>
            </Flex>
          }
        >
          {title}
        </DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
