import { atom } from "nanostores";
import { createAssetFolderHierarchy } from "@webstudio-is/sdk";
import { $assetFolders, $assets, $project } from "~/shared/sync/data-stores";
import {
  duplicateAssetManagerItems,
  moveAssetManagerItems,
  normalizeAssetManagerItems,
  type AssetManagerItem,
} from "./asset-manager-operations";

export type AssetManagerClipboardItem = {
  operation: "copy" | "cut";
  items: AssetManagerItem[];
  projectId: string;
};

export const $assetManagerClipboard = atom<
  AssetManagerClipboardItem | undefined
>(undefined);

const setAssetManagerClipboard = (
  operation: AssetManagerClipboardItem["operation"],
  itemOrItems: AssetManagerItem | readonly AssetManagerItem[]
) => {
  const items = Array.isArray(itemOrItems) ? [...itemOrItems] : [itemOrItems];
  const projectId = items[0]?.projectId;
  if (
    projectId === undefined ||
    items.some((item) => item.projectId !== projectId)
  ) {
    return;
  }
  $assetManagerClipboard.set({ operation, items, projectId });
};

export const copyAssetManagerItem = (
  itemOrItems: AssetManagerItem | readonly AssetManagerItem[]
) => setAssetManagerClipboard("copy", itemOrItems);

export const cutAssetManagerItem = (
  itemOrItems: AssetManagerItem | readonly AssetManagerItem[]
) => setAssetManagerClipboard("cut", itemOrItems);

export const duplicateAssetManagerItem = (
  itemOrItems: AssetManagerItem | readonly AssetManagerItem[],
  targetFolderId?: string | null
) => {
  const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
  return duplicateAssetManagerItems(items, targetFolderId);
};

export const createAssetManagerClipboardActions = (item: AssetManagerItem) => ({
  cut: () => cutAssetManagerItem(item),
  copy: () => copyAssetManagerItem(item),
  duplicate: () => duplicateAssetManagerItem(item),
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
  folderId: string | undefined
) => {
  if (
    data.items.length === 0 ||
    (folderId !== undefined && data.folders.has(folderId) === false)
  ) {
    return false;
  }
  if (data.clipboard.operation === "copy" || folderId === undefined) {
    return true;
  }
  const hierarchy = createAssetFolderHierarchy(data.folders);
  return data.items.every(
    (item) =>
      item.type === "asset" ||
      hierarchy.getSubtreeIds(item.id).has(folderId) === false
  );
};

export const canPasteAssetManagerItem = (folderId: string | undefined) => {
  const data = getClipboardItems();
  return data !== undefined && canPasteToFolder(data, folderId);
};

export const pasteAssetManagerItem = (folderId: string | undefined) => {
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
