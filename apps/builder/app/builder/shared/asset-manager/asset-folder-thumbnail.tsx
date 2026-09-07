import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { Grid, theme } from "@webstudio-is/design-system";
import {
  AlertCircleIcon,
  ChevronRightIcon,
  FolderIcon,
  ListViewIcon,
} from "@webstudio-is/icons";
import type { AssetFolder } from "@webstudio-is/sdk";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { AssetFolderSettingsDialog } from "./asset-folder-dialogs";
import {
  AssetThumbnailCard,
  AssetThumbnailGroup,
} from "./asset-thumbnail-card";
import {
  canPasteAssetManagerClipboard,
  createAssetManagerClipboardActions,
  pasteAssetManagerClipboard,
} from "./asset-manager-clipboard";
import { setAssetManagerDragPreview } from "./asset-manager-drag-preview";
import { getAssetManagerDragItems } from "./asset-manager-drag";
import { type AssetManagerItemActions } from "./asset-manager-item-menu";
import type { AssetManagerSelection } from "./asset-manager-selection";
import {
  AssetManagerThumbnail,
  AssetManagerThumbnailMenu,
  type AssetManagerThumbnailInteractions,
} from "./asset-manager-thumbnail";
import {
  canConfigureContentCollections,
  type ContentCollection,
} from "../assets/content-collections";
import {
  CollectionSettingsDialog,
  ConvertCollectionDialog,
} from "./collection-settings-dialog";
import { $authPermit, $isContentMode } from "~/shared/nano-states";

const acceptFolderClipboardItems = (items: readonly AssetManagerSelection[]) =>
  items.every((item) => item.type === "folder");

export const FolderThumbnail = ({
  folder,
  selected,
  interactions,
  onOpen,
  canManage,
  canCopyOrDelete = true,
  canPasteClipboard,
  onPasteClipboard,
  canMoveItems,
  onMoveItems,
  onMove,
  path,
  onElementChange,
  forcedSelection,
  selectionActions,
  collection,
}: {
  folder: AssetFolder;
  selected: boolean;
  interactions: AssetManagerThumbnailInteractions;
  onOpen: () => void;
  canManage: boolean;
  canCopyOrDelete?: boolean;
  canPasteClipboard?: boolean;
  onPasteClipboard?: () => void;
  canMoveItems: (
    items: readonly AssetManagerSelection[],
    folderId: string
  ) => boolean;
  onMoveItems: (
    items: readonly AssetManagerSelection[],
    folderId: string
  ) => void;
  onMove?: () => void;
  path?: string;
  onElementChange?: (element: HTMLElement | null) => void;
  forcedSelection?: boolean;
  selectionActions?: AssetManagerItemActions;
  collection?: ContentCollection;
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [settingsCollection, setSettingsCollection] = useState<
    Extract<ContentCollection, { status: "ready" }> | undefined
  >();
  const isContentMode = useStore($isContentMode);
  const [convertingCollection, setConvertingCollection] =
    useState<ContentCollection>();
  const authPermit = useStore($authPermit);
  const canConfigureCollections = canConfigureContentCollections(authPermit);
  const canConvertCollection =
    canManage &&
    isContentMode === false &&
    canConfigureCollections &&
    collection !== undefined;
  const canConfigureCollection =
    canConvertCollection && collection?.status === "ready";
  const convertibleCollectionRef = useRef<ContentCollection>();
  convertibleCollectionRef.current = canConvertCollection
    ? collection
    : undefined;
  const canManageRef = useRef(canManage);
  canManageRef.current = canManage;
  const canCopyOrDeleteRef = useRef(canCopyOrDelete);
  canCopyOrDeleteRef.current = canCopyOrDelete;
  const configurableCollectionRef = useRef<
    Extract<ContentCollection, { status: "ready" }> | undefined
  >();
  configurableCollectionRef.current = canConfigureCollection
    ? collection
    : undefined;
  const elementRef = useRef<HTMLElement | null>(null);
  const getDragItems = interactions.getDragItems;

  const openSettings = (confirmDelete = false) => {
    setDeleteConfirmationOpen(confirmDelete);
    setSettingsOpen(true);
  };
  const item = {
    type: "folder" as const,
    id: folder.id,
    projectId: folder.projectId,
  };
  const clipboardActions = createAssetManagerClipboardActions(item);
  const clipboardCanBePasted =
    canPasteClipboard ??
    canPasteAssetManagerClipboard(
      folder.id,
      collection === undefined ? undefined : acceptFolderClipboardItems
    );
  const clipboardCanBePastedRef = useRef(clipboardCanBePasted);
  clipboardCanBePastedRef.current = clipboardCanBePasted;
  useEffect(() => {
    if (canManage === false) {
      setSettingsOpen(false);
      setDeleteConfirmationOpen(false);
    }
  }, [canManage]);
  useEffect(() => {
    if (canConfigureCollection === false) {
      setSettingsCollection(undefined);
    }
  }, [canConfigureCollection]);
  useEffect(() => {
    if (!canConvertCollection) {
      setConvertingCollection(undefined);
    }
  }, [canConvertCollection]);
  const actions: AssetManagerItemActions = {
    open: onOpen,
    ...(canManage
      ? {
          settings: () => {
            if (canManageRef.current) {
              openSettings();
            }
          },
          ...(canConfigureCollection
            ? {
                collectionSettings: () => {
                  const currentCollection = configurableCollectionRef.current;
                  if (currentCollection !== undefined) {
                    setSettingsCollection(currentCollection);
                  }
                },
              }
            : {}),
          ...(canConvertCollection
            ? {
                convertCollection: () => {
                  const currentCollection = convertibleCollectionRef.current;
                  if (currentCollection !== undefined) {
                    setConvertingCollection(currentCollection);
                  }
                },
              }
            : {}),
          cut: () => {
            if (canManageRef.current) {
              clipboardActions.cut();
            }
          },
          ...(canCopyOrDelete
            ? {
                copy: () => {
                  if (canManageRef.current && canCopyOrDeleteRef.current) {
                    clipboardActions.copy();
                  }
                },
                duplicate: () => {
                  if (canManageRef.current && canCopyOrDeleteRef.current) {
                    clipboardActions.duplicate();
                  }
                },
              }
            : {}),
          move:
            onMove === undefined
              ? undefined
              : () => {
                  if (canManageRef.current) {
                    onMove();
                  }
                },
          paste: clipboardCanBePasted
            ? () => {
                if (
                  canManageRef.current === false ||
                  clipboardCanBePastedRef.current === false
                ) {
                  return;
                }
                if (onPasteClipboard !== undefined) {
                  onPasteClipboard();
                  return;
                }
                pasteAssetManagerClipboard(
                  folder.id,
                  collection === undefined
                    ? undefined
                    : acceptFolderClipboardItems
                );
              }
            : undefined,
          ...(canCopyOrDelete
            ? {
                delete: () => {
                  if (canManageRef.current && canCopyOrDeleteRef.current) {
                    openSettings(true);
                  }
                },
              }
            : {}),
        }
      : {}),
  };

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || canManage === false) {
      return;
    }
    return combine(
      draggable({
        element,
        onGenerateDragPreview: ({ nativeSetDragImage, location }) => {
          setAssetManagerDragPreview({
            nativeSetDragImage,
            sourceElement: element,
            input: location.initial.input,
            items: getDragItems({ type: "folder", id: folder.id }),
          });
        },
        getInitialData: () => ({
          kind: "asset-folder",
          id: folder.id,
          items: getDragItems({ type: "folder", id: folder.id }),
        }),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => {
          const items = getAssetManagerDragItems(source.data);
          return canMoveItems(items, folder.id);
        },
        onDragEnter: () => setIsDropTarget(true),
        onDragLeave: () => setIsDropTarget(false),
        onDrop: ({ source }) => {
          setIsDropTarget(false);
          const items = getAssetManagerDragItems(source.data);
          if (items.length === 0) {
            return;
          }
          onMoveItems(items, folder.id);
        },
      })
    );
  }, [canManage, canMoveItems, folder.id, getDragItems, onMoveItems]);

  const displayedActions =
    forcedSelection && selected ? (selectionActions ?? actions) : actions;

  return (
    <>
      <AssetManagerThumbnail
        item={{ type: "folder", id: folder.id }}
        actions={displayedActions}
        interactions={interactions}
        selected={selected}
        forcedSelection={forcedSelection}
        thumbnailRef={(element) => {
          elementRef.current = element;
          onElementChange?.(element);
        }}
        label={folder.name}
        path={path}
        preview={
          <Grid css={{ position: "relative" }}>
            <FolderIcon size={40} />
            {collection !== undefined && (
              <Grid
                css={{
                  position: "absolute",
                  inset: 0,
                  placeItems: "center",
                  paddingTop: theme.spacing[3],
                }}
              >
                {collection.status === "invalid" ? (
                  <AlertCircleIcon size={16} fill="currentColor" />
                ) : (
                  <ListViewIcon data-collection-folder-icon="" size={16} />
                )}
              </Grid>
            )}
          </Grid>
        }
        aria-label={`Folder ${folder.name}`}
        aria-description={
          collection === undefined
            ? "Double-click to open. Drag assets or folders here to move them."
            : "Content collection. Double-click to open. Only folders can be moved here."
        }
        data-is-drop-over={isDropTarget ? "true" : undefined}
        clickable
        dropTarget={isDropTarget}
        onDoubleClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onOpen();
          }
        }}
        header={
          canManage ? (
            <AssetManagerThumbnailMenu
              actions={displayedActions}
              label={`Actions for ${folder.name}`}
              onPointerDown={() => interactions.onContextMenuSelection(item)}
            />
          ) : undefined
        }
      />
      {canManage && (
        <AssetFolderSettingsDialog
          folder={folder}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          initialDeleteConfirmation={deleteConfirmationOpen}
          canDelete={canCopyOrDelete}
        />
      )}
      {canConfigureCollection && settingsCollection !== undefined && (
        <CollectionSettingsDialog
          collection={settingsCollection}
          open
          onOpenChange={(open) => {
            if (open === false) {
              setSettingsCollection(undefined);
            }
          }}
        />
      )}
      {canConvertCollection && convertingCollection !== undefined && (
        <ConvertCollectionDialog
          configAsset={convertingCollection.configAsset}
          onClose={() => setConvertingCollection(undefined)}
        />
      )}
    </>
  );
};

const backNavigationDelayMs = 2000;

export const BackThumbnail = ({
  onOpen,
  onElementChange,
}: {
  onOpen: () => void;
  onElementChange?: (element: HTMLElement | null) => void;
}) => {
  const elementRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (element === null) {
      return;
    }
    const cancelNavigation = () => {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
      setIsDragOver(false);
    };
    const cleanup = dropTargetForElements({
      element,
      canDrop: ({ source }) => getAssetManagerDragItems(source.data).length > 0,
      onDragEnter: () => {
        clearTimeout(timerRef.current);
        setIsDragOver(true);
        timerRef.current = setTimeout(onOpen, backNavigationDelayMs);
      },
      onDragLeave: cancelNavigation,
      onDrop: cancelNavigation,
    });
    return () => {
      clearTimeout(timerRef.current);
      cleanup();
    };
  }, [onOpen]);

  return (
    <AssetThumbnailGroup>
      <AssetThumbnailCard
        ref={(element) => {
          elementRef.current = element;
          onElementChange?.(element);
        }}
        as="button"
        type="button"
        label="Back"
        preview={
          <ChevronRightIcon size={48} style={{ transform: "rotate(180deg)" }} />
        }
        clickable
        dropTarget={isDragOver}
        onClick={onOpen}
      />
    </AssetThumbnailGroup>
  );
};
