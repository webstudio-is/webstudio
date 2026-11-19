import { createUniqueAssetIdsByPath } from "@webstudio-is/content-engine";
import { createCanonicalAssetPath } from "@webstudio-is/content-engine/mdx";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  type Asset,
  type AssetFolders,
} from "@webstudio-is/sdk";

export const createAssetUrlsByPath = ({
  assets,
  assetFolders,
  getUrl,
}: {
  assets: Iterable<Asset>;
  assetFolders: AssetFolders;
  getUrl: (asset: Asset) => string;
}) => {
  const hierarchy = createAssetFolderHierarchy(assetFolders);
  const urlsById = new Map<string, string>();
  const assetIdsByPath = createUniqueAssetIdsByPath(
    Array.from(assets).flatMap((asset) => {
      urlsById.set(asset.id, getUrl(asset));
      return [
        {
          id: asset.id,
          path: createCanonicalAssetPath({
            folderNames: hierarchy
              .getPath(asset.folderId)
              .map((folder) => folder.name),
            name: formatAssetName(asset),
          }),
        },
        {
          id: asset.id,
          path: createCanonicalAssetPath({
            folderNames: ["cgi", "asset"],
            name: asset.name,
          }),
        },
      ];
    })
  );
  return Object.fromEntries(
    Array.from(assetIdsByPath, ([path, assetId]) => {
      return [`/${path}`, urlsById.get(assetId)!];
    })
  );
};
