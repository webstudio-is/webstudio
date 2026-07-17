import { atom } from "nanostores";
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

export const pasteAssetManagerItem = (folderId: string | undefined) => {
  const clipboard = $assetManagerClipboard.get();
  if (clipboard === undefined) {
    return;
  }
  if (clipboard.projectId !== $project.get()?.id) {
    $assetManagerClipboard.set(undefined);
    return;
  }
  const items = normalizeAssetManagerItems({
    items: clipboard.items,
    folders: $assetFolders.get(),
    assets: $assets.get(),
  });
  if (clipboard.operation === "copy") {
    duplicateAssetManagerItems(items, folderId ?? null);
  } else {
    moveAssetManagerItems(items, folderId);
    $assetManagerClipboard.set(undefined);
  }
};
