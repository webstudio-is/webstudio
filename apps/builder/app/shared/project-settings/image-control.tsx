import type { ReactElement } from "react";
import { FloatingPanel } from "@webstudio-is/design-system";
import { AssetManager } from "~/builder/shared/asset-manager";

// @todo should be moved to shared as its being reused in another feature
export const ImageControl = (props: {
  onAssetIdChange: (assetId: string) => void;
  children: ReactElement;
}) => {
  return (
    <FloatingPanel
      title="Images"
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
