import { useEffect, useRef, useState } from "react";
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
  path,
  onElementChange,
}: {
  folder: AssetFolder;
  selected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onOpen: () => void;
  canManage: boolean;
  canMoveFolder: (folderId: string) => boolean;
  onMoveAsset: (assetId: string) => void;
  onMoveFolder: (folderId: string) => void;
  path?: string;
  onElementChange?: (element: HTMLElement | null) => void;
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
          rename: () => openSettings(),
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
        getInitialData: () => ({ kind: "asset-folder", id: folder.id }),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) =>
          source.data.kind === "asset" ||
          (source.data.kind === "asset-folder" &&
            typeof source.data.id === "string" &&
            canMoveFolder(source.data.id)),
        onDragEnter: () => setIsDropTarget(true),
        onDragLeave: () => setIsDropTarget(false),
        onDrop: ({ source }) => {
          setIsDropTarget(false);
          if (typeof source.data.id !== "string") {
            return;
          }
          if (source.data.kind === "asset") {
            onMoveAsset(source.data.id);
          } else if (source.data.kind === "asset-folder") {
            onMoveFolder(source.data.id);
          }
        },
      })
    );
  }, [canManage, canMoveFolder, folder.id, onMoveAsset, onMoveFolder]);

  return (
    <>
      <AssetManagerThumbnail
        actions={actions}
        selected={selected}
        onSelectionChange={onSelectionChange}
        thumbnailRef={(element) => {
          elementRef.current = element;
          onElementChange?.(element);
        }}
        label={folder.name}
        path={path}
        preview={<FolderIcon size={40} />}
        aria-label={`Folder ${folder.name}`}
        aria-description="Double-click to open. Drag assets or folders here to move them."
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
              actions={actions}
              label={`Actions for ${folder.name}`}
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

export const BackThumbnail = ({
  onOpen,
  onElementChange,
}: {
  onOpen: () => void;
  onElementChange?: (element: HTMLElement | null) => void;
}) => (
  <AssetThumbnailGroup>
    <AssetThumbnailCard
      ref={onElementChange}
      as="button"
      type="button"
      label="Back"
      preview={
        <ChevronRightIcon size={48} style={{ transform: "rotate(180deg)" }} />
      }
      clickable
      onClick={onOpen}
    />
  </AssetThumbnailGroup>
);
