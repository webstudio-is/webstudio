import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Flex,
  IconButton,
  PanelTitle,
  Separator,
  Tooltip,
  Text,
  theme,
  toast,
} from "@webstudio-is/design-system";
import {
  AlertCircleIcon,
  BrushCleaningIcon,
  PlusIcon,
  SettingsIcon,
} from "@webstudio-is/icons";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  formatAssetName,
  getAssetUrl,
  isTextFileAsset,
} from "@webstudio-is/sdk";
import { AssetManager } from "~/builder/shared/asset-manager";
import { AssetUpload, type AssetUploadHandle } from "~/builder/shared/assets";
import { uploadSingleAsset } from "~/builder/shared/assets/upload-assets";
import {
  canConfigureContentCollections,
  getCollectionReservedAssetIds,
  useContentCollections,
  type ContentCollection,
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
  const [collectionRefreshKey, setCollectionRefreshKey] = useState(0);
  const [collectionToConfigure, setCollectionToConfigure] = useState<string>();
  const [repairingCollection, setRepairingCollection] = useState(false);
  const [entryCollection, setEntryCollection] =
    useState<Extract<ContentCollection, { status: "ready" }>>();
  const [settingsCollection, setSettingsCollection] =
    useState<Extract<ContentCollection, { status: "ready" }>>();
  const [openedTextAssetId, setOpenedTextAssetId] = useState<string>();
  const uploadRef = useRef<AssetUploadHandle>(null);
  const authPermit = useStore($authPermit);
  const isContentMode = useStore($isContentMode);
  const canManageFolders = authPermit !== "view";
  const canConfigureCollections = canConfigureContentCollections(authPermit);
  const collections = useContentCollections(collectionRefreshKey);
  const collectionReservedAssetIds = getCollectionReservedAssetIds(
    collections,
    { includeInvalid: true }
  );
  const currentCollection =
    folderId === undefined ? undefined : collections.get(folderId);
  useEffect(() => {
    if (collectionToConfigure === undefined) {
      return;
    }
    const collection = collections.get(collectionToConfigure);
    if (collection?.status === "invalid") {
      setCollectionToConfigure(undefined);
      return;
    }
    if (collection?.status !== "ready") {
      return;
    }
    setCollectionToConfigure(undefined);
    setSettingsCollection(collection);
    setCollectionSettingsOpen(true);
  }, [collectionToConfigure, collections]);
  const builderRepair =
    currentCollection?.status === "invalid" &&
    isContentMode === false &&
    canConfigureCollections
      ? currentCollection
      : undefined;
  const editorRepair =
    currentCollection?.status === "invalid" && authPermit !== "view"
      ? currentCollection.editorRepair
      : undefined;
  const repairAssetToOpen =
    editorRepair?.action === "edit"
      ? editorRepair.asset
      : editorRepair === undefined &&
          builderRepair !== undefined &&
          builderRepair.missingTemplateFilename === undefined &&
          builderRepair.forbiddenAsset === undefined &&
          isTextFileAsset(builderRepair.repairAsset)
        ? builderRepair.repairAsset
        : undefined;
  const invalidCollectionMessage =
    currentCollection?.status !== "invalid"
      ? undefined
      : currentCollection.editorRepair !== undefined
        ? authPermit === "view"
          ? `${currentCollection.message} Ask an editor or builder to repair this collection.`
          : currentCollection.message
        : isContentMode
          ? "New entries are unavailable until a builder repairs this collection."
          : canConfigureCollections
            ? currentCollection.message
            : `${currentCollection.message} A builder must repair this collection.`;
  const addActions = {
    upload: () => uploadRef.current?.open(),
    createFile: () => setCreateTextFileOpen(true),
    createFolder: () => setCreateFolderOpen(true),
    createEntry: () => {
      if (currentCollection?.status === "ready") {
        setEntryCollection(currentCollection);
        setCreateEntryOpen(true);
      }
    },
  };
  const createMissingTemplate = async () => {
    if (
      currentCollection?.status !== "invalid" ||
      currentCollection.missingTemplateFilename === undefined ||
      repairingCollection
    ) {
      return;
    }
    setRepairingCollection(true);
    try {
      const template = await uploadSingleAsset(
        "file",
        new File(
          ["---\n---\n\nStart writing.\n"],
          currentCollection.missingTemplateFilename,
          { type: "text/mdx" }
        ),
        { folderId: currentCollection.folderId, deduplicate: true }
      );
      if (template === undefined) {
        throw new Error(
          "The missing collection template could not be created."
        );
      }
      setCollectionRefreshKey((key) => key + 1);
      toast.success("Collection template created.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The missing collection template could not be created."
      );
    } finally {
      setRepairingCollection(false);
    }
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
              isContentMode === false &&
              canConfigureCollections && (
                <Tooltip content="Collection settings">
                  <IconButton
                    aria-label="Collection settings"
                    onClick={() => {
                      setSettingsCollection(currentCollection);
                      setCollectionSettingsOpen(true);
                    }}
                  >
                    <SettingsIcon />
                  </IconButton>
                </Tooltip>
              )}
            {currentCollection?.status === "invalid" &&
              (builderRepair?.missingTemplateFilename !== undefined ||
                repairAssetToOpen !== undefined) && (
                <Tooltip content={currentCollection.message}>
                  <IconButton
                    aria-label="Repair invalid collection"
                    onClick={() => {
                      if (
                        builderRepair?.missingTemplateFilename !== undefined
                      ) {
                        void createMissingTemplate();
                        return;
                      }
                      if (repairAssetToOpen !== undefined) {
                        setOpenedTextAssetId(repairAssetToOpen.id);
                      }
                    }}
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
                {canManageFolders && (
                  <DropdownMenuItem onSelect={addActions.createFolder}>
                    Create folder
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      >
        Assets
      </PanelTitle>
      <Separator />
      {currentCollection?.status === "loading" && (
        <Flex
          role="status"
          align="center"
          css={{ padding: theme.panel.padding }}
        >
          <Text variant="tiny">Loading collection settings…</Text>
        </Flex>
      )}
      {currentCollection?.status === "invalid" && (
        <Flex
          role="alert"
          direction="column"
          gap={2}
          css={{ padding: theme.panel.padding }}
        >
          <Text color="destructive" variant="tiny">
            {invalidCollectionMessage}
          </Text>
          {(builderRepair !== undefined || editorRepair !== undefined) && (
            <Flex gap={2} wrap="wrap">
              {builderRepair?.missingTemplateFilename !== undefined && (
                <Button
                  disabled={repairingCollection}
                  onClick={() => void createMissingTemplate()}
                >
                  {repairingCollection
                    ? "Creating…"
                    : "Create missing template"}
                </Button>
              )}
              {repairAssetToOpen !== undefined && (
                <Button
                  onClick={() => setOpenedTextAssetId(repairAssetToOpen.id)}
                >
                  Open {formatAssetName(repairAssetToOpen)}
                </Button>
              )}
              <Button onClick={() => setCollectionRefreshKey((key) => key + 1)}>
                Check again
              </Button>
            </Flex>
          )}
        </Flex>
      )}
      <AssetManager
        folderId={folderId}
        onFolderChange={setFolderId}
        onOpen={openAsset}
        canManageFolders={canManageFolders}
        panelActions={{
          ...(authPermit === "view"
            ? {}
            : currentCollection === undefined
              ? {
                  upload: addActions.upload,
                  createFile: addActions.createFile,
                  ...(canManageFolders
                    ? { createFolder: addActions.createFolder }
                    : {}),
                }
              : {
                  ...(canManageFolders
                    ? { createFolder: addActions.createFolder }
                    : {}),
                  ...(currentCollection.status === "ready"
                    ? { createEntry: addActions.createEntry }
                    : {}),
                }),
          deleteUnusedAssets: openDeleteUnusedAssetsDialog,
        }}
        collections={collections}
        emptyMessage={
          currentCollection === undefined
            ? undefined
            : currentCollection.status === "ready"
              ? "No entries yet. Use New entry to create one."
              : "No collection entries are available."
        }
      />
      <CreateAssetFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onConfigureCollection={(createdFolderId) => {
          setFolderId(createdFolderId);
          setCollectionToConfigure(createdFolderId);
          setCollectionRefreshKey((key) => key + 1);
        }}
        currentFolderId={folderId}
        canCreateContentCollection={
          isContentMode === false && canConfigureCollections
        }
      />
      <CreateTextFileDialog
        open={createTextFileOpen}
        folderId={folderId}
        canCreateCollectionConfig={canConfigureCollections}
        onOpenChange={setCreateTextFileOpen}
        onCreated={setOpenedTextAssetId}
      />
      {openedTextAssetId !== undefined && (
        <TextFileEditor
          key={openedTextAssetId}
          assetId={openedTextAssetId}
          readOnly={
            canConfigureCollections === false &&
            collectionReservedAssetIds.has(openedTextAssetId)
          }
          onOpenChange={(open) => {
            if (open === false) {
              setOpenedTextAssetId(undefined);
            }
          }}
        />
      )}
      {entryCollection !== undefined && (
        <CreateCollectionEntryDialog
          collection={entryCollection}
          open={createEntryOpen}
          onOpenChange={(nextOpen) => {
            setCreateEntryOpen(nextOpen);
            if (nextOpen === false) {
              setEntryCollection(undefined);
            }
          }}
        />
      )}
      {settingsCollection !== undefined &&
        isContentMode === false &&
        canConfigureCollections && (
          <CollectionSettingsDialog
            collection={settingsCollection}
            open={collectionSettingsOpen}
            onOpenChange={(nextOpen) => {
              setCollectionSettingsOpen(nextOpen);
              if (nextOpen === false) {
                setSettingsCollection(undefined);
              }
            }}
          />
        )}
    </>
  );
};
