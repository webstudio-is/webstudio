import type { Asset } from "./schema/assets";
import type { AssetFolder } from "./schema/asset-folders";
import { createAssetFolderHierarchy } from "./asset-folder-hierarchy";

export const normalizeAssetFolderData = ({
  assets,
  folders,
}: {
  assets: readonly Asset[];
  folders: readonly AssetFolder[];
}) => {
  const hierarchy = createAssetFolderHierarchy(
    new Map(folders.map((folder) => [folder.id, folder]))
  );
  return {
    assets: assets.map((asset): Asset => {
      if (hierarchy.resolveFolderId(asset.folderId) === asset.folderId) {
        return asset;
      }
      const { folderId: _orphanedFolderId, ...rootAsset } = asset;
      return rootAsset;
    }),
    folders: Array.from(folders),
  };
};
