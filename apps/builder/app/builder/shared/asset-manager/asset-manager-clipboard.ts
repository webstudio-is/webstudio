import { atom } from "nanostores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { $project } from "~/shared/sync/data-stores";
import { moveAssetFolder, moveAssetToFolder } from "./asset-folder-actions";

export type AssetManagerClipboardItem = {
  operation: "copy" | "cut";
  type: "asset" | "folder";
  id: string;
  projectId: string;
};

export const $assetManagerClipboard = atom<
  AssetManagerClipboardItem | undefined
>(undefined);

export const copyAssetManagerItem = (
  item: Omit<AssetManagerClipboardItem, "operation">
) => $assetManagerClipboard.set({ ...item, operation: "copy" });

export const cutAssetManagerItem = (
  item: Omit<AssetManagerClipboardItem, "operation">
) => $assetManagerClipboard.set({ ...item, operation: "cut" });

export const duplicateAssetManagerItem = (
  item: Omit<AssetManagerClipboardItem, "operation">,
  targetFolderId?: string | null
) =>
  item.type === "asset"
    ? executeRuntimeMutation({
        id: "assets.duplicate",
        input: {
          assetId: item.id,
          ...(targetFolderId === undefined ? {} : { folderId: targetFolderId }),
        },
      })
    : executeRuntimeMutation({
        id: "assetFolders.duplicate",
        input: {
          folderId: item.id,
          ...(targetFolderId === undefined ? {} : { parentId: targetFolderId }),
        },
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
  const result =
    clipboard.operation === "copy"
      ? duplicateAssetManagerItem(clipboard, folderId ?? null)
      : clipboard.type === "asset"
        ? moveAssetToFolder(clipboard.id, folderId)
        : moveAssetFolder(clipboard.id, folderId);
  if (result !== undefined && clipboard.operation === "cut") {
    $assetManagerClipboard.set(undefined);
  }
  return result;
};
