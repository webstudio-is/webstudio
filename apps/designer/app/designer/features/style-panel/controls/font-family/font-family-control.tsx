import {
  TextField,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverPortal,
} from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { getFinalValue } from "../../shared/get-final-value";
import { PANEL_WIDTH } from "~/designer/shared/constants";
import { MutableRefObject, useRef, useState } from "react";
import { FontsManager } from "~/designer/shared/fonts-manager";

const usePickerSideOffset = (
  isOpen: boolean
): [MutableRefObject<HTMLInputElement | null>, number] => {
  const ref = useRef<HTMLInputElement | null>(null);
  const sideOffset =
    isOpen && ref.current !== null ? PANEL_WIDTH - ref.current.offsetWidth : 0;
  return [ref, sideOffset];
};

export const FontFamilyControl = ({
  currentStyle,
  inheritedStyle,
  //setProperty,
  styleConfig,
}: ControlProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [textFieldRef, sideOffset] = usePickerSideOffset(isOpen);
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) return null;

  //const setValue = setProperty(styleConfig.property);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <TextField
          ref={textFieldRef}
          spellCheck={false}
          defaultValue={value.value}
          onClick={() => {
            setIsOpen(true);
          }}
        />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent sideOffset={sideOffset} side="right" hideArrow>
          <PopoverHeader title="Fonts" />
          <FontsManager />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
