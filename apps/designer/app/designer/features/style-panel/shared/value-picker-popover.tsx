import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverPortal,
} from "@webstudio-is/design-system";
import { PANEL_WIDTH } from "~/designer/shared/constants";
import { MutableRefObject, useRef, useState } from "react";

const usePickerSideOffset = (
  isOpen: boolean
): [MutableRefObject<HTMLButtonElement | null>, number] => {
  const ref = useRef<HTMLButtonElement | null>(null);
  // Hack - depends on a relative position of a parent container to calculate the offset.
  const sideOffset =
    isOpen && ref.current !== null ? ref.current.offsetLeft : 0;
  return [ref, sideOffset];
};

type ValuePickerPopoverProps = {
  title: string;
  content: JSX.Element;
  children: JSX.Element;
  onOpenChange?: (isOpen: boolean) => void;
};

export const ValuePickerPopover = ({
  title,
  content,
  children,
  onOpenChange,
}: ValuePickerPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [ref, sideOffset] = usePickerSideOffset(isOpen);
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger
        asChild
        ref={ref}
        onClick={() => {
          handleOpenChange(true);
        }}
      >
        {children}
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          sideOffset={sideOffset}
          side="right"
          hideArrow
          align="start"
          css={{ width: PANEL_WIDTH }}
        >
          <PopoverHeader title={title} />
          {content}
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
