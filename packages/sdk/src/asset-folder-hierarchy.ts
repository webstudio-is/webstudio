import type { Asset } from "./schema/assets";
import type { AssetFolder, AssetFolders } from "./schema/asset-folders";

export const normalizeAssetFolderName = (name: string) =>
  name.trim().toLowerCase();

export const getAssetFolderSiblingKey = (
  parentId: string | undefined,
  name: string
) => JSON.stringify([parentId ?? null, normalizeAssetFolderName(name)]);

type AssetFolderTraversal = { path: AssetFolder[]; hasCycle: boolean };

const traverseAssetFolderAncestors = (
  folders: AssetFolders,
  folderId: string
): AssetFolderTraversal => {
  const path: AssetFolder[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = folderId;
  while (currentId !== undefined) {
    if (visited.has(currentId)) {
      return { path, hasCycle: true };
    }
    visited.add(currentId);
    const folder = folders.get(currentId);
    if (folder === undefined) {
      break;
    }
    path.unshift(folder);
    currentId = folder.parentId;
  }
  return { path, hasCycle: false };
};

export const createAssetFolderHierarchy = (folders: AssetFolders) => {
  const childrenByParentId = new Map<string | undefined, AssetFolder[]>();
  const traversalByFolderId = new Map<string, AssetFolderTraversal>();
  for (const folder of folders.values()) {
    const children = childrenByParentId.get(folder.parentId) ?? [];
    children.push(folder);
    childrenByParentId.set(folder.parentId, children);
  }

  const getTraversal = (folderId: string) => {
    const cached = traversalByFolderId.get(folderId);
    if (cached !== undefined) {
      return cached;
    }
    const traversal = traverseAssetFolderAncestors(folders, folderId);
    traversalByFolderId.set(folderId, traversal);
    return traversal;
  };

  const getChildren = (parentId: string | undefined): readonly AssetFolder[] =>
    childrenByParentId.get(parentId) ?? [];

  const resolveFolderId = (folderId: string | undefined) =>
    folderId !== undefined && folders.has(folderId) ? folderId : undefined;

  const getDescendantIds = (folderId: string | undefined) => {
    const descendants = new Set<string>();
    const pending: Array<string | undefined> = [folderId];
    while (pending.length > 0) {
      for (const child of getChildren(pending.pop())) {
        if (descendants.has(child.id) === false) {
          descendants.add(child.id);
          pending.push(child.id);
        }
      }
    }
    return descendants;
  };

  const getSubtreeIds = (folderId: string) =>
    getDescendantIds(folderId).add(folderId);

  const sortByDepth = (items: Iterable<AssetFolder>) =>
    Array.from(items).toSorted(
      (left, right) =>
        getTraversal(left.id).path.length - getTraversal(right.id).path.length
    );

  return {
    getChildren,
    getDescendantIds,
    getSubtreeIds,
    resolveFolderId,
    getPath: (folderId: string | undefined) =>
      folderId === undefined ? [] : getTraversal(folderId).path,
    hasCycle: (folderId: string) => getTraversal(folderId).hasCycle,
    sortByDepth,
    getAggregateAssetSizes: (assets: Iterable<Asset>) => {
      const sizes = new Map<string, number>();
      for (const asset of assets) {
        const folderId = resolveFolderId(asset.folderId);
        if (folderId !== undefined) {
          sizes.set(folderId, (sizes.get(folderId) ?? 0) + asset.size);
        }
      }
      for (const folder of sortByDepth(folders.values()).reverse()) {
        if (folder.parentId !== undefined) {
          sizes.set(
            folder.parentId,
            (sizes.get(folder.parentId) ?? 0) + (sizes.get(folder.id) ?? 0)
          );
        }
      }
      return sizes;
    },
    findByName: ({
      name,
      parentId,
      excludeIds = new Set(),
    }: {
      name: string;
      parentId: string | undefined;
      excludeIds?: ReadonlySet<string>;
    }) => {
      const siblingKey = getAssetFolderSiblingKey(parentId, name);
      for (const folder of folders.values()) {
        if (
          excludeIds.has(folder.id) === false &&
          getAssetFolderSiblingKey(folder.parentId, folder.name) === siblingKey
        ) {
          return folder;
        }
      }
    },
  };
};

export type AssetFolderHierarchy = ReturnType<
  typeof createAssetFolderHierarchy
>;
