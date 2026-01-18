import type { ReactElement } from "react";
import { FloatingPanel } from "@webstudio-is/design-system";
import { AssetManager } from "~/builder/shared/asset-manager";
import { AssetUpload } from "~/builder/shared/assets";

// @todo should be moved to shared as its being reused in another feature
export const ImageControl = (props: {
  onAssetIdChange: (assetId: string) => void;
  children: ReactElement;
}) => {
  return (
    <FloatingPanel
      title="Images"
      titleSuffix={<AssetUpload type="image" accept="image/*" />}
      placement="bottom-within"
      content={
        <AssetManager
          accept="image/*"
          onChange={(assetId) => {
            props.onAssetIdChange(assetId);
          }}
        />
      }
    >
      {props.children}
    </FloatingPanel>
  );
};
