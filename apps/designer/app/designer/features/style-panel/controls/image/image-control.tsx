import { TextField } from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { getFinalValue } from "../../shared/get-final-value";
import { ValuePickerPopover } from "../../shared/value-picker-popover";
import { ImageManager } from "~/designer/shared/image-manager";
import { useAssetContainers } from "~/designer/shared/assets";
import { toValue } from "@webstudio-is/css-engine";

export const ImageControl = ({
  currentStyle,
  inheritedStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  const { assets } = useAssetContainers("image");
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

  const selectedAsset = assets.find(
    (clientAsset) =>
      (clientAsset.asset?.id ?? clientAsset.preview?.id) === toValue(value)
  );

  return (
    <ValuePickerPopover
      title="Images"
      content={
        <ImageManager
          onChange={(clientAsset) => {
            if (clientAsset.status === "uploaded") {
              // @todo looks like a bug fix next PRs
              setValue(clientAsset.asset.id);
            }
          }}
        />
      }
    >
      <TextField defaultValue={selectedAsset?.asset?.name} />
    </ValuePickerPopover>
  );
};
