import {
  getAssetFolderPath,
  getAssetFolderDescendantIds,
  type Asset,
  type AssetFolder,
  type AssetFolders,
} from "@webstudio-is/sdk";
import type { SortState } from "./utils";

const getFolderSize = (
  folderId: string,
  folders: AssetFolders,
  assets: Iterable<Asset>
) => {
  const descendantIds = getAssetFolderDescendantIds(folders, folderId);
  descendantIds.add(folderId);
  let size = 0;
  for (const asset of assets) {
    if (asset.folderId !== undefined && descendantIds.has(asset.folderId)) {
      size += asset.size;
    }
  }
  return size;
};

export const sortAssetFolders = ({
  folders,
  allFolders,
  assets,
  sortState,
}: {
  folders: AssetFolder[];
  allFolders: AssetFolders;
  assets: Iterable<Asset>;
  sortState: SortState;
}) => {
  const direction = sortState.order === "asc" ? 1 : -1;
  const sizes = new Map<string, number>();
  if (sortState.sortBy === "size") {
    const assetList = Array.from(assets);
    for (const folder of folders) {
      sizes.set(folder.id, getFolderSize(folder.id, allFolders, assetList));
    }
  }
  return [...folders].sort((left, right) => {
    let comparison = 0;
    if (sortState.sortBy === "name") {
      comparison = left.name.localeCompare(right.name);
    } else if (sortState.sortBy === "createdAt") {
      comparison =
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime();
    } else {
      comparison = (sizes.get(left.id) ?? 0) - (sizes.get(right.id) ?? 0);
    }
    if (comparison === 0) {
      return left.name.localeCompare(right.name) * direction;
    }
    return comparison * direction;
  });
};

export const formatAssetFolderPath = (
  folders: AssetFolders,
  folderId: string | undefined
) => {
  const path = getAssetFolderPath(folders, folderId);
  return path.length === 0
    ? "No folder"
    : `Root / ${path.map(({ name }) => name).join(" / ")}`;
};
