import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  PanelTitle,
  Separator,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  BrushCleaningIcon,
  NewFolderIcon,
  NewPageIcon,
  PlusIcon,
  UploadIcon,
} from "@webstudio-is/icons";
import { useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { isTextFileAsset } from "@webstudio-is/sdk";
import { AssetManager } from "~/builder/shared/asset-manager";
import { AssetUpload, type AssetUploadHandle } from "~/builder/shared/assets";
import { openDeleteUnusedAssetsDialog } from "~/builder/shared/asset-manager/delete-unused-assets";
import { CreateAssetFolderDialog } from "~/builder/shared/asset-manager/asset-folder-dialogs";
import { $authPermit } from "~/shared/nano-states";
import { $assets } from "~/shared/sync/data-stores";
import type { Publish } from "~/shared/pubsub";
import { useImageAssetCanvasDrag } from "./use-image-asset-canvas-drag";
import { TextFileEditor } from "~/builder/features/text-file-editor/text-file-editor";
import { CreateTextFileDialog } from "~/builder/features/text-file-editor/create-text-file-dialog";
import { getAssetUrl } from "~/builder/shared/assets/asset-utils";

export const AssetsPanel = ({
  publish,
}: {
  publish: Publish;
  onClose: () => void;
}) => {
  const [folderId, setFolderId] = useState<string>();
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createTextFileOpen, setCreateTextFileOpen] = useState(false);
  const [openedTextAssetId, setOpenedTextAssetId] = useState<string>();
  const uploadRef = useRef<AssetUploadHandle>(null);
  const authPermit = useStore($authPermit);
  const openAsset = (assetId: string) => {
    const asset = $assets.get().get(assetId);
    if (asset === undefined) {
      return;
    }
    if (isTextFileAsset(asset)) {
      setOpenedTextAssetId(assetId);
      return;
    }
    window.open(
      getAssetUrl(asset, window.location.origin),
      "_blank",
      "noopener,noreferrer"
    );
  };
  useImageAssetCanvasDrag(publish);
  return (
    <>
      <AssetUpload
        ref={uploadRef}
        type="file"
        folderId={folderId}
        showTrigger={false}
      />
      <PanelTitle
        suffix={
          <>
            <Tooltip content="Delete unused assets">
              <IconButton
                aria-label="Delete unused assets"
                onClick={openDeleteUnusedAssetsDialog}
              >
                <BrushCleaningIcon />
              </IconButton>
            </Tooltip>
            <DropdownMenu>
              <Tooltip content="Add asset">
                <DropdownMenuTrigger asChild>
                  <IconButton
                    disabled={authPermit === "view"}
                    aria-label="Add asset"
                  >
                    <PlusIcon />
                  </IconButton>
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => uploadRef.current?.open()}>
                  <UploadIcon />
                  Upload
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setCreateTextFileOpen(true)}>
                  <NewPageIcon />
                  Create text file
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setCreateFolderOpen(true)}>
                  <NewFolderIcon />
                  Create folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      >
        Assets
      </PanelTitle>
      <Separator />
      <AssetManager
        folderId={folderId}
        onFolderChange={setFolderId}
        onOpen={openAsset}
        canManageFolders={authPermit !== "view"}
        panelActions={{
          ...(authPermit === "view"
            ? {}
            : {
                createFolder: () => setCreateFolderOpen(true),
                createFile: () => setCreateTextFileOpen(true),
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
      <CreateTextFileDialog
        open={createTextFileOpen}
        folderId={folderId}
        onOpenChange={setCreateTextFileOpen}
        onCreated={setOpenedTextAssetId}
      />
      {openedTextAssetId !== undefined && (
        <TextFileEditor
          key={openedTextAssetId}
          assetId={openedTextAssetId}
          onOpenChange={(open) => {
            if (open === false) {
              setOpenedTextAssetId(undefined);
            }
          }}
        />
      )}
    </>
  );
};
