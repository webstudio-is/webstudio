import { TextField } from "@webstudio-is/design-system";
import type { ControlProps } from "../../style-sections";
import { getFinalValue } from "../../shared/get-final-value";
import { FloatingPanel } from "~/designer/shared/floating-panel";
import { ImageManager } from "~/designer/shared/image-manager";
import { useAssets } from "~/designer/shared/assets";
import { toValue } from "@webstudio-is/css-engine";

export const ImageControl = ({
  currentStyle,
  setProperty,
  styleConfig,
}: ControlProps) => {
  const { assetContainers } = useAssets("image");
  // @todo show which instance we inherited the value from
  const value = getFinalValue({
    currentStyle,
    property: styleConfig.property,
  });

  if (value === undefined) {
    return null;
  }

  const setValue = setProperty(styleConfig.property);

  const selectedAsset = assetContainers.find(
    (assetContainer) => assetContainer.asset.id === toValue(value)
  );

  return (
    <FloatingPanel
      title="Images"
      content={
        <ImageManager
          onChange={(asset) => {
            // @todo looks like a bug fix next PRs
            setValue(asset.id);
          }}
        />
      }
    >
      <TextField defaultValue={selectedAsset?.asset.name} />
    </FloatingPanel>
  );
};
