import { FloatingPanel } from "~/builder/shared/floating-panel";
import { ImageManager } from "~/builder/shared/image-manager";
import type { ReactElement } from "react";
import { theme } from "@webstudio-is/design-system";

export const ImageControl = (props: {
  assetId: string;
  onAssetIdChange: (assetId: string) => void;
  children: ReactElement;
}) => {
  return (
    <FloatingPanel
      title="Images"
      contentCss={{
        // Left Aside panels (e.g., Pages, Components) use zIndex: theme.zIndices[1].
        // For a panel to appear above these panels, both overlay and content should also have zIndex: theme.zIndices[1].
        zIndex: theme.zIndices[1],
      }}
      content={
        <ImageManager
          onChange={(asset) => {
            props.onAssetIdChange(asset.id);
          }}
        />
      }
    >
      {props.children}
    </FloatingPanel>
  );
};
