import {
  Grid,
  TextField,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverPortal,
} from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { getFinalValue } from "../../shared/get-final-value";
import { PropertyName } from "../../shared/property-name";
import { PANEL_WIDTH } from "~/designer/shared/constants";
import { MutableRefObject, Ref, RefObject, useRef, useState } from "react";

const textFieldStyle = {
  height: "$6",
  fontWeight: "500",
};

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
    <Grid columns={2}>
      <PropertyName property={styleConfig.property} label={styleConfig.label} />

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <TextField
            ref={textFieldRef}
            css={textFieldStyle}
            spellCheck={false}
            readOnly
            defaultValue={value.value}
            onClick={(event) => {
              setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                // @todo show font picker
              }
            }}
          />
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent sideOffset={sideOffset} side="right" hideArrow>
            <PopoverHeader title="Assets" />
          </PopoverContent>
        </PopoverPortal>
      </Popover>
    </Grid>
  );
};
