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
  const sideOffset =
    isOpen && ref.current !== null ? PANEL_WIDTH - ref.current.offsetWidth : 0;
  return [ref, sideOffset];
};

type AssetPickerProps = {
  title: string;
  content: JSX.Element;
  children: JSX.Element;
};

export const ValuePickerPopover = ({
  title,
  content,
  children,
}: AssetPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [ref, sideOffset] = usePickerSideOffset(isOpen);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal>
      <PopoverTrigger
        asChild
        ref={ref}
        onClick={() => {
          setIsOpen(true);
        }}
      >
        {children}
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          sideOffset={sideOffset}
          side="right"
          hideArrow
          css={{ minHeight: 500 }}
        >
          <PopoverHeader title={title} />
          {content}
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
