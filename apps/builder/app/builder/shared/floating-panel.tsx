import {
  type RefObject,
  useContext,
  useRef,
  useState,
  createContext,
  useLayoutEffect,
  type JSX,
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
  // collisionPadding is the distance in pixels from the boundary edges where collision detection should occur.
  collisionPadding?:
    | number
    | Partial<Record<"top" | "right" | "bottom" | "left", number>>;
  align?: "start" | "center" | "end";
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
  onIsOpenChange: setExternalIsOpen,
  collisionPadding,
}: FloatingPanelProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen ?? internalIsOpen;
  const setIsOpen = setExternalIsOpen ?? setInternalIsOpen;
  const { container: containerRef } = useContext(FloatingPanelContext);
  const [triggerRef, sideOffset] = useSideOffset({ isOpen, containerRef });

  return (
    <FloatingPanelPopover open={isOpen} onOpenChange={setIsOpen} modal>
      <FloatingPanelPopoverTrigger asChild ref={triggerRef}>
        {children}
      </FloatingPanelPopoverTrigger>
      <FloatingPanelPopoverContent
        sideOffset={sideOffset}
        side="left"
        align={align ?? "start"}
        className={contentStyle()}
        collisionPadding={collisionPadding}
      >
        {content}
        <FloatingPanelPopoverTitle>{title}</FloatingPanelPopoverTitle>
      </FloatingPanelPopoverContent>
    </FloatingPanelPopover>
  );
};
