import {
  type Asset,
  type AssetFolder,
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
    ? "No folder"
    : `Root / ${path.map(({ name }) => name).join(" / ")}`;
};
