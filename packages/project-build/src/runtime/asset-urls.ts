import { createCanonicalAssetPath } from "@webstudio-is/content-engine/mdx";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  type Asset,
  type AssetFolders,
} from "@webstudio-is/sdk";

export const createAssetUrlMap = ({
  assets,
  assetFolders,
  getUrl,
}: {
  assets: Iterable<Asset>;
  assetFolders: AssetFolders;
  getUrl: (asset: Asset) => string;
}) => {
  const hierarchy = createAssetFolderHierarchy(assetFolders);
  const entries = Array.from(assets, (asset) => {
    const path = `/${createCanonicalAssetPath({
      folderNames: hierarchy
        .getPath(asset.folderId)
        .map((folder) => folder.name),
      name: formatAssetName(asset),
    })}`;
    return { path, url: getUrl(asset) };
  });
  const pathCounts = new Map<string, number>();
  for (const { path } of entries) {
    pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
  }
  return Object.fromEntries(
    entries.flatMap(({ path, url }) =>
      pathCounts.get(path) === 1 ? [[path, url]] : []
    )
  );
};
