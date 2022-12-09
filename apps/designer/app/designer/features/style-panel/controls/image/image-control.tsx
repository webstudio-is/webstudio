import { TextField } from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { getFinalValue } from "../../shared/get-final-value";
import { ValuePickerPopover } from "../../shared/value-picker-popover";
import { ImageManager } from "~/designer/shared/image-manager";
import { useAssets } from "~/designer/shared/assets";

export const ImageControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  const { assets } = useAssets("image");
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    inheritedStyle,
    property: styleConfig.property,
  });

  if (value === undefined) {
    return null;
  }

  const setValue = setProperty(styleConfig.property);

  const selectedAsset = assets.find((asset) => asset.id === value.value);

  return (
    <ValuePickerPopover
      title="Images"
      content={
        <ImageManager
          onChange={(asset) => {
            setValue(asset.id);
          }}
        />
      }
    >
      <TextField defaultValue={selectedAsset?.name} />
    </ValuePickerPopover>
  );
};
