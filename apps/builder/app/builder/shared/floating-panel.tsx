import {
  type RefObject,
  useContext,
  useRef,
  useState,
  createContext,
  useLayoutEffect,
  type JSX,
  type ComponentProps,
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

// @todo add support for positioning next to the left panel
type FloatingPanelProps = {
  title: string;
  content: JSX.Element;
  children: JSX.Element;
  isOpen?: boolean;
  onIsOpenChange?: (isOpen: boolean) => void;
  align?: "start" | "center" | "end";
  maximizable?: boolean;
  resize?: ComponentProps<typeof DialogContent>["resize"];
};

const contentStyle = css({
  width: theme.sizes.sidebarWidth,
});

export const FloatingPanel = ({
  title,
  content,
  children,
  isOpen: externalIsOpen,
  align,
  resize,
  maximizable,
  onIsOpenChange: setExternalIsOpen,
}: FloatingPanelProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen ?? internalIsOpen;
  const setIsOpen = setExternalIsOpen ?? setInternalIsOpen;
  const { container: containerRef } = useContext(FloatingPanelContext);
  const [triggerRef, sideOffset] = useSideOffset({ isOpen, containerRef });
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} modal>
      <DialogTrigger asChild ref={triggerRef}>
        {children}
      </DialogTrigger>
      <DialogContent
        resize={resize}
        className={contentStyle()}
        isMaximized={false}
        //width={width}
        //height={height}
        //x={x}
        //y={y}
        onInteractOutside={(event) => {
          event.preventDefault();
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
