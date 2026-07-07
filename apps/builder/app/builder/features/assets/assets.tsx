import {
  IconButton,
  PanelTitle,
  Separator,
  Tooltip,
} from "@webstudio-is/design-system";
import { BrushCleaningIcon } from "@webstudio-is/icons";
import { AssetManager } from "~/builder/shared/asset-manager";
import { AssetUpload } from "~/builder/shared/assets";
import { openDeleteUnusedAssetsDialog } from "~/builder/shared/asset-manager/delete-unused-assets";

export const AssetsPanel = (_props: { onClose: () => void }) => {
  return (
    <>
      <PanelTitle
        suffix={
          <>
            <Tooltip content="Delete unused assets">
              <IconButton onClick={openDeleteUnusedAssetsDialog}>
                <BrushCleaningIcon />
              </IconButton>
            </Tooltip>
            <AssetUpload type="file" />
          </>
        }
      >
        Assets
      </PanelTitle>
      <Separator />
      <AssetManager />
    </>
  );
};
