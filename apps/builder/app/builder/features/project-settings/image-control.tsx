import { FloatingPanel } from "~/builder/shared/floating-panel";
import { ImageManager } from "~/builder/shared/image-manager";
import type { ReactElement } from "react";

// @todo should be moved to shared as its being reused in another feature
export const ImageControl = (props: {
  onAssetIdChange: (assetId: string) => void;
  children: ReactElement;
}) => {
  return (
    <FloatingPanel
      title="Images"
      content={
        <ImageManager
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
