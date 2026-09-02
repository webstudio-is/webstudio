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
  AlertCircleIcon,
  BrushCleaningIcon,
  PlusIcon,
  SettingsIcon,
} from "@webstudio-is/icons";
import { useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { getAssetUrl, isTextFileAsset } from "@webstudio-is/sdk";
import { AssetManager } from "~/builder/shared/asset-manager";
import { AssetUpload, type AssetUploadHandle } from "~/builder/shared/assets";
import {
  getCollectionReservedAssetIds,
  useContentCollections,
} from "~/builder/shared/assets";
import { openDeleteUnusedAssetsDialog } from "~/builder/shared/asset-manager/delete-unused-assets";
import { CreateAssetFolderDialog } from "~/builder/shared/asset-manager/asset-folder-dialogs";
import { $authPermit, $isContentMode } from "~/shared/nano-states";
import { $assets } from "~/shared/sync/data-stores";
import type { Publish } from "~/shared/pubsub";
import { useImageAssetCanvasDrag } from "./use-image-asset-canvas-drag";
import { TextFileEditor } from "~/builder/features/text-file-editor/text-file-editor";
import { CreateTextFileDialog } from "~/builder/features/text-file-editor/create-text-file-dialog";
import { CreateCollectionEntryDialog } from "~/builder/shared/asset-manager/create-collection-entry-dialog";
import { CollectionSettingsDialog } from "~/builder/shared/asset-manager/collection-settings-dialog";

export const AssetsPanel = ({
  publish,
}: {
  publish: Publish;
  onClose: () => void;
}) => {
  const [folderId, setFolderId] = useState<string>();
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createTextFileOpen, setCreateTextFileOpen] = useState(false);
  const [createEntryOpen, setCreateEntryOpen] = useState(false);
  const [collectionSettingsOpen, setCollectionSettingsOpen] = useState(false);
  const [openedTextAssetId, setOpenedTextAssetId] = useState<string>();
  const uploadRef = useRef<AssetUploadHandle>(null);
  const authPermit = useStore($authPermit);
  const isContentMode = useStore($isContentMode);
  const collections = useContentCollections();
  const currentCollection =
    folderId === undefined ? undefined : collections.get(folderId);
  const reservedAssetIds = getCollectionReservedAssetIds(collections);
  const addActions = {
    upload: () => uploadRef.current?.open(),
    createFile: () => setCreateTextFileOpen(true),
    createFolder: () => setCreateFolderOpen(true),
    createEntry: () => setCreateEntryOpen(true),
  };
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
            {currentCollection?.status === "ready" &&
              isContentMode === false && (
                <Tooltip content="Collection settings">
                  <IconButton
                    aria-label="Collection settings"
                    onClick={() => setCollectionSettingsOpen(true)}
                  >
                    <SettingsIcon />
                  </IconButton>
                </Tooltip>
              )}
            {currentCollection?.status === "invalid" &&
              isContentMode === false && (
                <Tooltip
                  content={`${currentCollection.message}. Open collection.json to repair it.`}
                >
                  <IconButton
                    disabled={authPermit === "view"}
                    aria-label="Repair invalid collection configuration"
                    onClick={() =>
                      setOpenedTextAssetId(currentCollection.configAsset.id)
                    }
                  >
                    <AlertCircleIcon />
                  </IconButton>
                </Tooltip>
              )}
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
                {currentCollection === undefined && (
                  <>
                    <DropdownMenuItem onSelect={addActions.upload}>
                      Upload
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={addActions.createFile}>
                      Create text file
                    </DropdownMenuItem>
                  </>
                )}
                {currentCollection?.status === "ready" && (
                  <DropdownMenuItem onSelect={addActions.createEntry}>
                    New entry
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={addActions.createFolder}>
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
            : currentCollection === undefined
              ? addActions
              : {
                  createFolder: addActions.createFolder,
                  ...(currentCollection.status === "ready"
                    ? { createEntry: addActions.createEntry }
                    : {}),
                }),
          deleteUnusedAssets: openDeleteUnusedAssetsDialog,
        }}
        collections={collections}
        hiddenAssetIds={reservedAssetIds}
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
      {currentCollection?.status === "ready" && (
        <>
          <CreateCollectionEntryDialog
            collection={currentCollection}
            open={createEntryOpen}
            onOpenChange={setCreateEntryOpen}
          />
          {isContentMode === false && (
            <CollectionSettingsDialog
              collection={currentCollection}
              open={collectionSettingsOpen}
              onOpenChange={setCollectionSettingsOpen}
            />
          )}
        </>
      )}
    </>
  );
};
