import {
  PanelContent,
  PanelBanner,
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
import {
  CreateAssetFolderDialog,
  type createContentCollectionFolder,
} from "~/builder/shared/asset-manager/asset-folder-dialogs";
import { $authPermit, $isContentMode } from "~/shared/nano-states";
import { $assets, $project } from "~/shared/sync/data-stores";
import {
  $settings,
  getSetting,
  setSetting,
} from "~/builder/shared/client-settings";
import type { Publish } from "~/shared/pubsub";
import { useImageAssetCanvasDrag } from "./use-image-asset-canvas-drag";
import { TextFileEditor } from "~/builder/features/text-file-editor/text-file-editor";
import { CreateTextFileDialog } from "~/builder/features/text-file-editor/create-text-file-dialog";
import { CreateCollectionEntryDialog } from "~/builder/shared/asset-manager/create-collection-entry-dialog";
import {
  CollectionSettingsDialog,
  ConvertCollectionDialog,
} from "~/builder/shared/asset-manager/collection-settings-dialog";
import {
  CollectionRetryButton,
  CollectionUnavailableNotice,
} from "./collection-unavailable-notice";
import { useCollectionEntryValidation } from "~/builder/shared/assets/use-collection-entry-validation";
import { CollectionEntrySettingsDialog } from "~/builder/shared/asset-manager/collection-entry-settings-dialog";
import type { Asset } from "@webstudio-is/sdk";

export const AssetsPanel = ({
  publish,
  createCollection,
}: {
  publish: Publish;
  onClose: () => void;
  createCollection?: typeof createContentCollectionFolder;
}) => {
  const projectId = useStore($project)?.id;
  const settings = useStore($settings);
  const folderId =
    projectId === undefined
      ? undefined
      : settings.lastAssetFolderIds[projectId];
  const setFolderId = (folderId: string | undefined) => {
    if (projectId === undefined) {
      return;
    }
    const current = getSetting("lastAssetFolderIds");
    if (current[projectId] === folderId) {
      return;
    }
    const next = { ...current };
    if (folderId === undefined) {
      delete next[projectId];
    } else {
      next[projectId] = folderId;
    }
    setSetting("lastAssetFolderIds", next);
  };
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createTextFileOpen, setCreateTextFileOpen] = useState(false);
  const [collectionRefreshKey, setCollectionRefreshKey] = useState(0);
  const [collectionToConfigure, setCollectionToConfigure] = useState<string>();
  const configureCollection = (folderId: string) => {
    setFolderId(folderId);
    setCollectionToConfigure(folderId);
    setCollectionRefreshKey((key) => key + 1);
  };
  const [collectionToConvert, setCollectionToConvert] =
    useState<ContentCollection>();
  const [repairingCollection, setRepairingCollection] = useState(false);
  const [entryCollection, setEntryCollection] =
    useState<Extract<ContentCollection, { status: "ready" }>>();
  const [settingsCollection, setSettingsCollection] =
    useState<Extract<ContentCollection, { status: "ready" }>>();
  const [openedTextAssetId, setOpenedTextAssetId] = useState<string>();
  const [entrySettings, setEntrySettings] = useState<{
    asset: Asset;
    collection: Extract<ContentCollection, { status: "ready" }>;
  }>();
  const uploadRef = useRef<AssetUploadHandle>(null);
  const authPermit = useStore($authPermit);
  const isContentMode = useStore($isContentMode);
  const canManageFolders = authPermit !== "view";
  const canConfigureCollections = canConfigureContentCollections(authPermit);
  const collections = useContentCollections(folderId, collectionRefreshKey);
  const collectionReservedAssetIds = getCollectionReservedAssetIds(
    collections,
    { includeInvalid: true }
  );
  const currentCollection =
    folderId === undefined ? undefined : collections.get(folderId);
  const entryValidation = useCollectionEntryValidation(currentCollection);
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
  }, [collectionToConfigure, collections]);
  const builderRepair =
    currentCollection?.status === "invalid" &&
    isContentMode === false &&
    canConfigureCollections
      ? currentCollection
      : undefined;
  const repairAction = builderRepair?.repairAction;
  const repairAssetToOpen =
    repairAction === "edit" && builderRepair !== undefined
      ? builderRepair.repairAsset
      : repairAction === undefined &&
          builderRepair !== undefined &&
          builderRepair.missingTemplateFilename === undefined &&
          builderRepair.forbiddenAsset === undefined &&
          isTextFileAsset(builderRepair.repairAsset)
        ? builderRepair.repairAsset
        : undefined;
  const invalidCollectionMessage =
    currentCollection?.status !== "invalid"
      ? undefined
      : builderRepair?.repairAction !== undefined
        ? currentCollection.message
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
                {(currentCollection === undefined ||
                  currentCollection.status === "ready") && (
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
        {currentCollection === undefined ? "Assets" : "Assets collection"}
      </PanelTitle>
      <Separator />
      <AssetManager
        entryIssues={entryValidation.issues}
        folderNotice={
          <>
            {currentCollection?.status === "ready" &&
              entryValidation.issues !== undefined &&
              entryValidation.issues.size > 0 && (
                <PanelBanner variant="warning" role="status">
                  <Flex direction="column" gap={2}>
                    <Text>
                      {entryValidation.issues.size}{" "}
                      {entryValidation.issues.size === 1
                        ? "entry needs"
                        : "entries need"}{" "}
                      attention. Open a marked entry to inspect it.
                    </Text>
                    <Button onClick={entryValidation.retry}>Check again</Button>
                  </Flex>
                </PanelBanner>
              )}
            {currentCollection?.status === "loading" && (
              <PanelContent as={Flex} role="status" align="center">
                <Text variant="tiny">Loading collection settings…</Text>
              </PanelContent>
            )}
            {currentCollection?.status === "invalid" && (
              <PanelContent as={Flex} role="alert" direction="column" gap={2}>
                <Text color="destructive" variant="tiny">
                  {invalidCollectionMessage}
                </Text>
                {builderRepair !== undefined && (
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
                        onClick={() =>
                          setOpenedTextAssetId(repairAssetToOpen.id)
                        }
                      >
                        Open {formatAssetName(repairAssetToOpen)}
                      </Button>
                    )}
                    <CollectionRetryButton
                      collection={currentCollection}
                      onCheckAgain={() =>
                        setCollectionRefreshKey((key) => key + 1)
                      }
                    />
                  </Flex>
                )}
              </PanelContent>
            )}
            {currentCollection?.status === "unavailable" && (
              <CollectionUnavailableNotice
                collection={currentCollection}
                onCheckAgain={() => setCollectionRefreshKey((key) => key + 1)}
              />
            )}
          </>
        }
        folderId={folderId}
        onFolderChange={setFolderId}
        onConfigureCollection={configureCollection}
        createCollection={createCollection}
        onOpen={openAsset}
        onEntrySettings={(assetId) => {
          const asset = $assets.get().get(assetId);
          const collection = collections.get(asset?.folderId ?? "");
          if (asset !== undefined && collection?.status === "ready") {
            setEntrySettings({ asset, collection });
          }
        }}
        canManageFolders={canManageFolders}
        panelActions={{
          ...(authPermit === "view"
            ? {}
            : {
                ...(currentCollection === undefined ||
                currentCollection.status === "ready"
                  ? {
                      upload: addActions.upload,
                      createFile: addActions.createFile,
                    }
                  : {}),
                ...(currentCollection?.status === "ready"
                  ? { createEntry: addActions.createEntry }
                  : {}),
                ...(canManageFolders
                  ? { createFolder: addActions.createFolder }
                  : {}),
              }),
          deleteUnusedAssets: openDeleteUnusedAssetsDialog,
          ...(currentCollection !== undefined &&
          canConfigureCollections &&
          !isContentMode
            ? {
                convertCollection: () =>
                  setCollectionToConvert(currentCollection),
              }
            : {}),
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
        onConfigureCollection={configureCollection}
        createCollection={createCollection}
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
          open
          onOpenChange={(nextOpen) => {
            if (nextOpen === false) {
              setEntryCollection(undefined);
            }
          }}
        />
      )}
      {entrySettings !== undefined && (
        <CollectionEntrySettingsDialog
          key={entrySettings.asset.id}
          {...entrySettings}
          onClose={() => setEntrySettings(undefined)}
          onOpenFile={() => openAsset(entrySettings.asset.id)}
        />
      )}
      {settingsCollection !== undefined &&
        isContentMode === false &&
        canConfigureCollections && (
          <CollectionSettingsDialog
            collection={settingsCollection}
            open
            onOpenChange={(nextOpen) => {
              if (nextOpen === false) {
                setSettingsCollection(undefined);
              }
            }}
          />
        )}
      {collectionToConvert !== undefined &&
        canConfigureCollections &&
        !isContentMode && (
          <ConvertCollectionDialog
            configAsset={collectionToConvert.configAsset}
            onClose={() => setCollectionToConvert(undefined)}
          />
        )}
    </>
  );
};
