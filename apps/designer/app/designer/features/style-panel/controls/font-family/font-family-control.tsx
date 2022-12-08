import { TextField } from "@webstudio-is/design-system";
import { FontsManager } from "~/designer/shared/fonts-manager";
import type { ControlProps } from "../../style-sections";
import { getFinalValue } from "../../shared/get-final-value";
import { ValuePickerPopover } from "../../shared/value-picker-popover";
import { useState } from "react";

export const FontFamilyControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });
  const [isOpen, setIsOpen] = useState(false);

  if (value === undefined) {
    return null;
  }

  const setValue = setProperty(styleConfig.property);

  return (
    <ValuePickerPopover
      title="Fonts"
      content={<FontsManager value={String(value.value)} onChange={setValue} />}
      onOpenChange={setIsOpen}
    >
      <TextField
        defaultValue={value.value}
        state={isOpen ? "active" : undefined}
      />
    </ValuePickerPopover>
  );
};
