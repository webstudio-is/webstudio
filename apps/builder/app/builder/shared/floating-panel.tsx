import {
  type MutableRefObject,
  type RefObject,
  useContext,
  useRef,
  useState,
  createContext,
  useLayoutEffect,
} from "react";
import {
  FloatingPanelPopover,
  theme,
  css,
  FloatingPanelPopoverTrigger,
  FloatingPanelPopoverContent,
  FloatingPanelPopoverTitle,
} from "@webstudio-is/design-system";

export const useSideOffset = ({
  side = "left",
  isOpen,
  containerRef,
}: {
  side?: "left" | "right";
  isOpen: boolean;
  containerRef?: RefObject<HTMLElement>;
}): [MutableRefObject<HTMLButtonElement | null>, number] => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
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
  container: RefObject<HTMLElement>;
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
  container: RefObject<HTMLElement>;
}) => (
  <FloatingPanelContext.Provider value={{ container }}>
    {children}
  </FloatingPanelContext.Provider>
);

const useLogic = (open?: boolean, onOpenChange?: (isOpen: boolean) => void) => {
  const { container: containerRef } = useContext(FloatingPanelContext);
  const [isOpen, setIsOpen] = useState(Boolean(open));
  const [triggerRef, sideOffset] = useSideOffset({ isOpen, containerRef });
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };
  return { isOpen, handleOpenChange, triggerRef, sideOffset };
};

// @todo add support for positioning next to the left panel
type FloatingPanelProps = {
  title: string;
  content: JSX.Element;
  children: JSX.Element;
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
};

const contentStyle = css({
  width: theme.spacing[30],
});

export const FloatingPanel = ({
  title,
  content,
  children,
  open,
  onOpenChange,
}: FloatingPanelProps) => {
  const { isOpen, handleOpenChange, triggerRef, sideOffset } = useLogic(
    open,
    onOpenChange
  );

  return (
    <FloatingPanelPopover open={isOpen} onOpenChange={handleOpenChange} modal>
      <FloatingPanelPopoverTrigger asChild ref={triggerRef}>
        {children}
      </FloatingPanelPopoverTrigger>
      <FloatingPanelPopoverContent
        sideOffset={sideOffset}
        side="left"
        align="start"
        className={contentStyle()}
      >
        {content}
        <FloatingPanelPopoverTitle>{title}</FloatingPanelPopoverTitle>
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};
