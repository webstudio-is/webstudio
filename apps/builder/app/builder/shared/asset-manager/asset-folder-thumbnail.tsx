import { useEffect, useRef, useState } from "react";
import {
  Box,
  SmallIconButton,
  styled,
  Tooltip,
} from "@webstudio-is/design-system";
import { ChevronLeftIcon, FolderIcon, GearIcon } from "@webstudio-is/icons";
import type { AssetFolder } from "@webstudio-is/sdk";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { AssetFolderSettingsDialog } from "./asset-folder-dialogs";
import { AssetThumbnailCard } from "./asset-thumbnail-card";

const Settings = styled(Box, {
  position: "absolute",
  right: 4,
  top: 4,
  opacity: 0,
  pointerEvents: "none",
  "[data-folder-thumbnail]:hover &, [data-folder-thumbnail]:focus-within &": {
    opacity: 1,
    pointerEvents: "auto",
  },
});

export const FolderThumbnail = ({
  folder,
  selected,
  onSelect,
  onOpen,
  canManage,
  canMoveFolder,
  onMoveAsset,
  onMoveFolder,
}: {
  folder: AssetFolder;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  canManage: boolean;
  canMoveFolder: (folderId: string) => boolean;
  onMoveAsset: (assetId: string) => void;
  onMoveFolder: (folderId: string) => void;
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

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
      <Box data-folder-thumbnail css={{ position: "relative", minWidth: 0 }}>
        <AssetThumbnailCard
          ref={elementRef}
          as="button"
          type="button"
          label={folder.name}
          preview={<FolderIcon size={48} strokeWidth={0.5} />}
          aria-label={`Folder ${folder.name}`}
          aria-description="Double-click to open. Drag assets or folders here to move them."
          aria-pressed={selected}
          clickable
          selected={selected}
          dropTarget={isDropTarget}
          onClick={onSelect}
          onDoubleClick={onOpen}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onOpen();
            }
          }}
        />
        {canManage && (
          <Settings>
            <Tooltip content="Folder settings">
              <SmallIconButton
                icon={<GearIcon />}
                aria-label={`Settings for ${folder.name}`}
                onClick={() => setSettingsOpen(true)}
              />
            </Tooltip>
          </Settings>
        )}
      </Box>
      {canManage && (
        <AssetFolderSettingsDialog
          folder={folder}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}
    </>
  );
};

export const BackThumbnail = ({ onOpen }: { onOpen: () => void }) => (
  <AssetThumbnailCard
    as="button"
    type="button"
    label="Back"
    preview={<ChevronLeftIcon size={48} />}
    clickable
    onClick={onOpen}
  />
);
