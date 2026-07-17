import {
  IconButton,
  PanelTitle,
  Separator,
  Tooltip,
} from "@webstudio-is/design-system";
import { BrushCleaningIcon, NewFolderIcon } from "@webstudio-is/icons";
import { useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { AssetManager } from "~/builder/shared/asset-manager";
import { AssetUpload, type AssetUploadHandle } from "~/builder/shared/assets";
import { openDeleteUnusedAssetsDialog } from "~/builder/shared/asset-manager/delete-unused-assets";
import { CreateAssetFolderDialog } from "~/builder/shared/asset-manager/asset-folder-dialogs";
import { $authPermit } from "~/shared/nano-states";

export const AssetsPanel = (_props: { onClose: () => void }) => {
  const [folderId, setFolderId] = useState<string>();
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const uploadRef = useRef<AssetUploadHandle>(null);
  const authPermit = useStore($authPermit);
  return (
    <>
      <PanelTitle
        suffix={
          <>
            <Tooltip content="Create folder">
              <IconButton
                disabled={authPermit === "view"}
                aria-label="Create asset folder"
                onClick={() => setCreateFolderOpen(true)}
              >
                <NewFolderIcon />
              </IconButton>
            </Tooltip>
            <Tooltip content="Delete unused assets">
              <IconButton onClick={openDeleteUnusedAssetsDialog}>
                <BrushCleaningIcon />
              </IconButton>
            </Tooltip>
            <AssetUpload ref={uploadRef} type="file" folderId={folderId} />
          </>
        }
      >
        Assets
      </PanelTitle>
      <Separator />
      <AssetManager
        folderId={folderId}
        onFolderChange={setFolderId}
        canManageFolders={authPermit !== "view"}
        panelActions={{
          ...(authPermit === "view"
            ? {}
            : {
                createFolder: () => setCreateFolderOpen(true),
                upload: () => uploadRef.current?.open(),
              }),
          deleteUnusedAssets: openDeleteUnusedAssetsDialog,
        }}
      />
      <CreateAssetFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        currentFolderId={folderId}
      />
    </>
  );
};
