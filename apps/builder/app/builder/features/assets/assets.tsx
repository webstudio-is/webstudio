import { PanelTitle, Separator } from "@webstudio-is/design-system";
import { AssetManager } from "~/builder/shared/asset-manager";

export const AssetsPanel = (_props: { onClose: () => void }) => {
  return (
    <>
      <PanelTitle>Assets</PanelTitle>
      <Separator />
      <AssetManager />
    </>
  );
};
