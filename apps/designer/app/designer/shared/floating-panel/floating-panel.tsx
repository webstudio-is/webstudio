import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverPortal,
} from "@webstudio-is/design-system";
import { MutableRefObject, useContext, useRef, useState } from "react";
import { FloatingPanelContext } from "./floating-panel-provider";

const useSideOffset = ({
  isOpen,
}: {
  isOpen: boolean;
}): [MutableRefObject<HTMLButtonElement | null>, number] => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const { container } = useContext(FloatingPanelContext);
  if (isOpen === false) {
    // Prevent computation if the panel is closed
    return [triggerRef, 0];
  }
  const containerRect = container?.current?.getBoundingClientRect();
  const triggerRect = triggerRef.current?.getBoundingClientRect();
  return [triggerRef, (triggerRect?.left ?? 0) - (containerRect?.left ?? 0)];
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

export const FloatingPanel = ({
  title,
  content,
  children,
  onOpenChange,
}: FloatingPanelProps) => {
  const { isOpen, handleOpenChange, triggerRef, sideOffset } =
    useLogic(onOpenChange);
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger
        asChild
        ref={triggerRef}
        onClick={() => {
          handleOpenChange(true);
        }}
      >
        {children}
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          sideOffset={sideOffset}
          side="left"
          hideArrow
          align="start"
          css={{ width: "$spacing$30" }}
        >
          {content}
          <PopoverHeader title={title} />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
