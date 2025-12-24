import { PanelTitle, Separator } from "@webstudio-is/design-system";
import { AssetManager } from "~/builder/shared/asset-manager";
import { AssetUpload } from "~/builder/shared/assets";

export const AssetsPanel = (_props: { onClose: () => void }) => {
  return (
    <>
      <PanelTitle suffix={<AssetUpload type="file" />}>Assets</PanelTitle>
      <Separator />
      <AssetManager />
    </>
  );
};
