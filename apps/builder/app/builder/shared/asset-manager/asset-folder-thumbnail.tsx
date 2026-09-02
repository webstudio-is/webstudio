import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { ChevronRightIcon, FolderIcon, ListIcon } from "@webstudio-is/icons";
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
import type { ContentCollection } from "../assets/content-collections";
import { CollectionSettingsDialog } from "./collection-settings-dialog";
import { $isContentMode } from "~/shared/nano-states";

export const FolderThumbnail = ({
  folder,
  selected,
  interactions,
  onOpen,
  canManage,
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
  const [collectionSettingsOpen, setCollectionSettingsOpen] = useState(false);
  const isContentMode = useStore($isContentMode);
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
  const actions: AssetManagerItemActions = {
    open: onOpen,
    ...(canManage
      ? {
          settings: () => openSettings(),
          ...(collection?.status === "ready" && isContentMode === false
            ? { collectionSettings: () => setCollectionSettingsOpen(true) }
            : {}),
          ...createAssetManagerClipboardActions(item),
          move: onMove,
          paste:
            collection === undefined && canPasteAssetManagerClipboard(folder.id)
              ? () => pasteAssetManagerClipboard(folder.id)
              : undefined,
          delete: () => openSettings(true),
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
          <div style={{ position: "relative" }}>
            <FolderIcon size={40} />
            {collection !== undefined && (
              <ListIcon
                size={16}
                style={{ position: "absolute", right: -4, bottom: -2 }}
              />
            )}
          </div>
        }
        aria-label={`Folder ${folder.name}`}
        aria-description="Double-click to open. Drag assets or folders here to move them."
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
        />
      )}
      {canManage &&
        collection?.status === "ready" &&
        isContentMode === false && (
          <CollectionSettingsDialog
            collection={collection}
            open={collectionSettingsOpen}
            onOpenChange={setCollectionSettingsOpen}
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
