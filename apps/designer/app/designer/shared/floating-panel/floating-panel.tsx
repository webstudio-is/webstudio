import {
  FloatingPanelPopover as Popover,
  theme,
  css,
} from "@webstudio-is/design-system";
import {
  MutableRefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { FloatingPanelContext } from "./floating-panel-provider";

const useSideOffset = ({
  isOpen,
}: {
  isOpen: boolean;
}): [MutableRefObject<HTMLButtonElement | null>, number] => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const { container: containerRef } = useContext(FloatingPanelContext);
  const [sideOffset, setSideOffset] = useState(0);

  useEffect(() => {
    if (
      isOpen === false ||
      containerRef.current === null ||
      triggerRef.current === null
    ) {
      // Prevent computation if the panel is closed
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const triggerRect = triggerRef.current.getBoundingClientRect();
    setSideOffset(triggerRect.left - containerRect.left);
  }, [isOpen, containerRef]);

  return [triggerRef, sideOffset];
};

const useLogic = (onOpenChange?: (isOpen: boolean) => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerRef, sideOffset] = useSideOffset({ isOpen });
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
  onOpenChange?: (isOpen: boolean) => void;
};

const contetnStyles = css({ width: theme.spacing[30] });

export const FloatingPanel = ({
  title,
  content,
  children,
  onOpenChange,
}: FloatingPanelProps) => {
  const { isOpen, handleOpenChange, triggerRef, sideOffset } =
    useLogic(onOpenChange);
  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange} modal>
      <Popover.Trigger
        asChild
        ref={triggerRef}
        onClick={() => {
          handleOpenChange(true);
        }}
      >
        {children}
      </Popover.Trigger>
      <Popover.Content
        sideOffset={sideOffset}
        side="left"
        align="start"
        className={contetnStyles()}
      >
        {content}
        <Popover.Title>{title}</Popover.Title>
      </Popover.Content>
    </Popover.Root>
  );
};
