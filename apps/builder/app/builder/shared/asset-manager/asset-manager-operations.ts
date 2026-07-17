import {
  createAssetFolderHierarchy,
  type Asset,
  type AssetFolder,
  type AssetFolderHierarchy,
} from "@webstudio-is/sdk";
import {
  executeRuntimeMutationSequence,
  type RuntimeMutationOperation,
} from "~/shared/instance-utils/data";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { invalidateAssets } from "~/shared/resources";
import {
  getAssetManagerSelectionKey,
  type AssetManagerSelection,
} from "./asset-manager-selection";

export type AssetManagerItem = AssetManagerSelection & { projectId: string };

export const canMoveAssetManagerItems = ({
  items,
  targetFolderId,
  hierarchy,
}: {
  items: readonly AssetManagerSelection[];
  targetFolderId: string | undefined;
  hierarchy: AssetFolderHierarchy;
}) => {
  if (items.length === 0) {
    return false;
  }
  if (
    targetFolderId !== undefined &&
    hierarchy.resolveFolderId(targetFolderId) !== targetFolderId
  ) {
    return false;
  }
  for (const item of items) {
    if (item.type === "asset") {
      continue;
    }
    if (hierarchy.resolveFolderId(item.id) !== item.id) {
      return false;
    }
    if (
      targetFolderId !== undefined &&
      hierarchy.getSubtreeIds(item.id).has(targetFolderId)
    ) {
      return false;
    }
  }
  return true;
};

export const normalizeAssetManagerItems = ({
  items,
  folders,
  assets,
}: {
  items: readonly AssetManagerSelection[];
  folders: ReadonlyMap<string, AssetFolder>;
  assets: ReadonlyMap<string, Asset>;
}): AssetManagerSelection[] => {
  const uniqueItems = Array.from(
    new Map(
      items.map((item) => [getAssetManagerSelectionKey(item), item])
    ).values()
  ).filter((item) =>
    item.type === "folder" ? folders.has(item.id) : assets.has(item.id)
  );
  const selectedFolderIds = new Set(
    uniqueItems.flatMap((item) => (item.type === "folder" ? [item.id] : []))
  );
  const hierarchy = createAssetFolderHierarchy(new Map(folders));
  const rootFolderIds = new Set(
    Array.from(selectedFolderIds).filter((folderId) =>
      hierarchy
        .getPath(folderId)
        .slice(0, -1)
        .every((ancestor) => selectedFolderIds.has(ancestor.id) === false)
    )
  );
  const coveredFolderIds = new Set(
    Array.from(rootFolderIds).flatMap((folderId) =>
      Array.from(hierarchy.getSubtreeIds(folderId))
    )
  );
  return uniqueItems.filter((item) => {
    if (item.type === "folder") {
      return rootFolderIds.has(item.id);
    }
    const asset = assets.get(item.id)!;
    return (
      asset.folderId === undefined ||
      coveredFolderIds.has(asset.folderId) === false
    );
  });
};

const getOperations = ({
  items,
  folderId,
  operation,
}: {
  items: readonly AssetManagerSelection[];
  folderId?: string | null;
  operation: "duplicate" | "move";
}): RuntimeMutationOperation[] =>
  items.map((item) => {
    if (operation === "duplicate") {
      return item.type === "asset"
        ? {
            id: "assets.duplicate" as const,
            input: {
              assetId: item.id,
              ...(folderId === undefined ? {} : { folderId }),
            },
          }
        : {
            id: "assetFolders.duplicate" as const,
            input: {
              folderId: item.id,
              ...(folderId === undefined ? {} : { parentId: folderId }),
            },
          };
    }
    return item.type === "asset"
      ? {
          id: "assets.update" as const,
          input: { assetId: item.id, values: { folderId: folderId ?? null } },
        }
      : {
          id: "assetFolders.update" as const,
          input: { folderId: item.id, values: { parentId: folderId ?? null } },
        };
  });

export const duplicateAssetManagerItems = (
  items: readonly AssetManagerSelection[],
  targetFolderId?: string | null
) =>
  executeRuntimeMutationSequence(
    getOperations({ items, folderId: targetFolderId, operation: "duplicate" })
  );

export const moveAssetManagerItems = (
  items: readonly AssetManagerSelection[],
  targetFolderId: string | undefined
) =>
  executeRuntimeMutationSequence(
    getOperations({ items, folderId: targetFolderId, operation: "move" })
  );

export const deleteAssetManagerItems = (
  items: readonly AssetManagerSelection[]
) => {
  const assetIds = items.flatMap((item) =>
    item.type === "asset" ? [item.id] : []
  );
  const operations: RuntimeMutationOperation[] = [
    ...(assetIds.length === 0
      ? []
      : [
          {
            id: "assets.delete" as const,
            input: { assetIdsOrPrefixes: assetIds, force: true },
          },
        ]),
    ...items.flatMap((item) =>
      item.type === "folder"
        ? [
            {
              id: "assetFolders.delete" as const,
              input: { folderId: item.id },
            },
          ]
        : []
    ),
  ];
  executeRuntimeMutationSequence(operations);
  if (assetIds.length > 0 || items.some((item) => item.type === "folder")) {
    onNextTransactionComplete(invalidateAssets);
  }
};
