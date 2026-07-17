import { atom } from "nanostores";
import { createAssetFolderHierarchy } from "@webstudio-is/sdk";
import { $assetFolders, $assets, $project } from "~/shared/sync/data-stores";
import {
  canMoveAssetManagerItems,
  duplicateAssetManagerItems,
  moveAssetManagerItems,
  normalizeAssetManagerItems,
  type AssetManagerItem,
} from "./asset-manager-operations";
import type { AssetManagerSelection } from "./asset-manager-selection";

type AssetManagerClipboard = {
  operation: "copy" | "cut";
  items: AssetManagerSelection[];
  projectId: string;
};

export const $assetManagerClipboard = atom<AssetManagerClipboard | undefined>(
  undefined
);

const setAssetManagerClipboard = (
  operation: AssetManagerClipboard["operation"],
  items: readonly AssetManagerItem[]
) => {
  const projectId = items[0]?.projectId;
  if (
    projectId === undefined ||
    items.some((item) => item.projectId !== projectId)
  ) {
    return;
  }
  $assetManagerClipboard.set({
    operation,
    items: items.map(({ type, id }) => ({ type, id })),
    projectId,
  });
};

export const copyAssetManagerItems = (items: readonly AssetManagerItem[]) =>
  setAssetManagerClipboard("copy", items);

export const cutAssetManagerItems = (items: readonly AssetManagerItem[]) =>
  setAssetManagerClipboard("cut", items);

export const createAssetManagerClipboardActions = (item: AssetManagerItem) => ({
  cut: () => cutAssetManagerItems([item]),
  copy: () => copyAssetManagerItems([item]),
  duplicate: () => duplicateAssetManagerItems([item]),
});

const getClipboardItems = () => {
  const clipboard = $assetManagerClipboard.get();
  const projectId = $project.get()?.id;
  if (clipboard === undefined || clipboard.projectId !== projectId) {
    return;
  }
  const folders = $assetFolders.get();
  const items = normalizeAssetManagerItems({
    items: clipboard.items,
    folders,
    assets: $assets.get(),
  });
  return { clipboard, folders, items };
};

const canPasteToFolder = (
  data: NonNullable<ReturnType<typeof getClipboardItems>>,
  targetFolderId: string | undefined
) => {
  if (data.clipboard.operation === "cut") {
    return canMoveAssetManagerItems({
      items: data.items,
      targetFolderId,
      hierarchy: createAssetFolderHierarchy(data.folders),
    });
  }
  return (
    data.items.length > 0 &&
    (targetFolderId === undefined || data.folders.has(targetFolderId))
  );
};

export const canPasteAssetManagerClipboard = (folderId: string | undefined) => {
  const data = getClipboardItems();
  return data !== undefined && canPasteToFolder(data, folderId);
};

export const pasteAssetManagerClipboard = (folderId: string | undefined) => {
  const data = getClipboardItems();
  if (data === undefined) {
    const clipboard = $assetManagerClipboard.get();
    if (clipboard !== undefined && clipboard.projectId !== $project.get()?.id) {
      $assetManagerClipboard.set(undefined);
    }
    return;
  }
  if (data.items.length === 0) {
    $assetManagerClipboard.set(undefined);
    return;
  }
  if (canPasteToFolder(data, folderId) === false) {
    return;
  }
  const { clipboard, items } = data;
  if (clipboard.operation === "copy") {
    duplicateAssetManagerItems(items, folderId ?? null);
  } else {
    moveAssetManagerItems(items, folderId);
    $assetManagerClipboard.set(undefined);
  }
};
