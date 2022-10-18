import { TextField } from "@webstudio-is/design-system";
import { FontsManager } from "~/designer/shared/fonts-manager";
import type { ControlProps } from "../../style-sections";
import { getFinalValue } from "../../shared/get-final-value";
import { ValuePickerPopover } from "../../shared/value-picker-popover";

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

  if (value === undefined) return null;

  const setValue = setProperty(styleConfig.property);

  return (
    <ValuePickerPopover
      title="Fonts"
      content={<FontsManager value={String(value.value)} onChange={setValue} />}
    >
      {/* @todo this should be part of the design system, probably a varian="button" */}
      <TextField defaultValue={value.value} />
    </ValuePickerPopover>
  );
};
