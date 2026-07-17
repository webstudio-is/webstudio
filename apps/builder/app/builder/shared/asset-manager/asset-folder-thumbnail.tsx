import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { useStore } from "@nanostores/react";
import { ChevronRightIcon, FolderIcon } from "@webstudio-is/icons";
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
  $assetManagerClipboard,
  createAssetManagerClipboardActions,
  pasteAssetManagerItem,
} from "./asset-manager-clipboard";
import { setAssetManagerDragPreview } from "./asset-manager-drag-preview";
import { getAssetManagerDragItems } from "./asset-manager-drag";
import { type AssetManagerItemActions } from "./asset-manager-item-menu";
import {
  AssetManagerThumbnail,
  AssetManagerThumbnailMenu,
} from "./asset-manager-thumbnail";

export const FolderThumbnail = ({
  folder,
  selected,
  onSelectionChange,
  onOpen,
  canManage,
  canMoveFolder,
  onMoveAsset,
  onMoveFolder,
  onMoveItems,
  path,
  onElementChange,
  forcedSelection,
  selectionActions,
  onItemPointerDown,
  onItemClick,
  onModifiedArrow,
  onExitMultiselect,
  onContextMenuSelection,
  getDragItems,
}: {
  folder: AssetFolder;
  selected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onOpen: () => void;
  canManage: boolean;
  canMoveFolder: (folderId: string) => boolean;
  onMoveAsset: (assetId: string) => void;
  onMoveFolder: (folderId: string) => void;
  onMoveItems?: (
    items: Array<{ type: "asset" | "folder"; id: string }>
  ) => void;
  path?: string;
  onElementChange?: (element: HTMLElement | null) => void;
  forcedSelection?: boolean;
  selectionActions?: AssetManagerItemActions;
  onItemPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onItemClick?: (event: MouseEvent<HTMLElement>) => void;
  onModifiedArrow?: (event: KeyboardEvent<HTMLElement>) => void;
  onExitMultiselect?: () => void;
  onContextMenuSelection?: () => void;
  getDragItems?: () => Array<{ type: "asset" | "folder"; id: string }>;
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const clipboard = useStore($assetManagerClipboard);

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
          ...createAssetManagerClipboardActions(item),
          paste:
            clipboard?.projectId !== folder.projectId
              ? undefined
              : () => pasteAssetManagerItem(folder.id),
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
            items: getDragItems?.() ?? [],
          });
        },
        getInitialData: () => ({
          kind: "asset-folder",
          id: folder.id,
          items: getDragItems?.(),
        }),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => {
          const items = getAssetManagerDragItems(source.data);
          return (
            items.length > 0 &&
            items.every(
              (item) => item.type === "asset" || canMoveFolder(item.id)
            )
          );
        },
        onDragEnter: () => setIsDropTarget(true),
        onDragLeave: () => setIsDropTarget(false),
        onDrop: ({ source }) => {
          setIsDropTarget(false);
          const items = getAssetManagerDragItems(source.data);
          if (items.length === 0) {
            return;
          }
          if (items.length > 1) {
            onMoveItems?.(items);
            return;
          }
          const item = items[0]!;
          if (item.type === "asset") {
            onMoveAsset(item.id);
          } else {
            onMoveFolder(item.id);
          }
        },
      })
    );
  }, [
    canManage,
    canMoveFolder,
    folder.id,
    getDragItems,
    onMoveAsset,
    onMoveFolder,
    onMoveItems,
  ]);

  const displayedActions = selectionActions ?? actions;

  return (
    <>
      <AssetManagerThumbnail
        item={{ type: "folder", id: folder.id }}
        actions={displayedActions}
        selected={selected}
        forcedSelection={forcedSelection}
        onSelectionChange={onSelectionChange}
        onItemPointerDown={onItemPointerDown}
        onItemClick={onItemClick}
        onModifiedArrow={onModifiedArrow}
        onExitMultiselect={onExitMultiselect}
        onContextMenuSelection={onContextMenuSelection}
        thumbnailRef={(element) => {
          elementRef.current = element;
          onElementChange?.(element);
        }}
        label={folder.name}
        path={path}
        preview={<FolderIcon size={40} />}
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
              onPointerDown={onContextMenuSelection}
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
