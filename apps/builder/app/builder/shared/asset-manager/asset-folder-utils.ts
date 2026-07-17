import {
  type Asset,
  type AssetFolder,
  type AssetFolders,
  type AssetFolderHierarchy,
} from "@webstudio-is/sdk";
import type { SortState } from "./utils";

export const sortAssetFolders = ({
  folders,
  hierarchy,
  assets,
  sortState,
}: {
  folders: AssetFolder[];
  hierarchy: AssetFolderHierarchy;
  assets: Iterable<Asset>;
  sortState: SortState;
}) => {
  const direction = sortState.order === "asc" ? 1 : -1;
  const sizes =
    sortState.sortBy === "size"
      ? hierarchy.getAggregateAssetSizes(assets)
      : new Map<string, number>();
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
  hierarchy: AssetFolderHierarchy,
  folderId: string | undefined
) => {
  const path = hierarchy.getPath(folderId);
  return path.length === 0
    ? "Root"
    : `Root / ${path.map(({ name }) => name).join(" / ")}`;
};

export const filterAssetFolders = ({
  folders,
  hierarchy,
  currentFolderId,
  searchQuery,
  compatibleAssets,
  hideEmptyFolders,
}: {
  folders: AssetFolders;
  hierarchy: AssetFolderHierarchy;
  currentFolderId: string | undefined;
  searchQuery: string;
  compatibleAssets: Iterable<Asset>;
  hideEmptyFolders: boolean;
}) => {
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const candidates =
    normalizedSearch === ""
      ? hierarchy.getChildren(currentFolderId)
      : Array.from(hierarchy.getDescendantIds(currentFolderId)).flatMap(
          (folderId) => {
            const folder = folders.get(folderId);
            return folder !== undefined &&
              folder.name.toLocaleLowerCase().includes(normalizedSearch)
              ? [folder]
              : [];
          }
        );

  if (hideEmptyFolders === false) {
    return [...candidates];
  }

  const foldersWithCompatibleAssets = new Set<string>();
  for (const asset of compatibleAssets) {
    for (const folder of hierarchy.getPath(asset.folderId)) {
      foldersWithCompatibleAssets.add(folder.id);
    }
  }
  return candidates.filter((folder) =>
    foldersWithCompatibleAssets.has(folder.id)
  );
};
