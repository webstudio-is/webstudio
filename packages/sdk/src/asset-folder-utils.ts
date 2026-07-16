import {
  normalizeAssetFolderName,
  type AssetFolder,
  type AssetFolders,
} from "./schema/asset-folders";

export const getAssetFolderDescendantIds = (
  folders: AssetFolders,
  folderId: string | undefined
) => {
  const descendants = new Set<string>();
  const pending: Array<string | undefined> = [folderId];
  while (pending.length > 0) {
    const parentId = pending.pop();
    for (const folder of folders.values()) {
      if (
        folder.parentId === parentId &&
        descendants.has(folder.id) === false
      ) {
        descendants.add(folder.id);
        pending.push(folder.id);
      }
    }
  }
  return descendants;
};

export const getAssetFolderPath = (
  folders: AssetFolders,
  folderId: string | undefined
) => {
  const path: AssetFolder[] = [];
  const visited = new Set<string>();
  let currentId = folderId;
  while (currentId !== undefined && visited.has(currentId) === false) {
    visited.add(currentId);
    const folder = folders.get(currentId);
    if (folder === undefined) {
      break;
    }
    path.unshift(folder);
    currentId = folder.parentId;
  }
  return path;
};

export const findAssetFolderByName = (
  folders: AssetFolders,
  {
    name,
    parentId,
    excludeIds = new Set(),
  }: {
    name: string;
    parentId: string | undefined;
    excludeIds?: ReadonlySet<string>;
  }
) => {
  const normalizedName = normalizeAssetFolderName(name);
  for (const folder of folders.values()) {
    if (
      folder.parentId === parentId &&
      excludeIds.has(folder.id) === false &&
      normalizeAssetFolderName(folder.name) === normalizedName
    ) {
      return folder;
    }
  }
};

export const sortAssetFoldersByDepth = (folders: Iterable<AssetFolder>) => {
  const list = Array.from(folders);
  const byId = new Map(list.map((folder) => [folder.id, folder]));
  const getDepth = (folder: AssetFolder) => {
    let depth = 0;
    let parentId = folder.parentId;
    while (parentId !== undefined) {
      depth += 1;
      parentId = byId.get(parentId)?.parentId;
    }
    return depth;
  };
  return list.toSorted((left, right) => getDepth(left) - getDepth(right));
};
