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
  const assetUrlPaths = new Set<string>();
  const assetIdsByPath = createUniqueAssetIdsByPath(
    Array.from(assets).flatMap((asset) => {
      const url = getUrl(asset);
      urlsById.set(asset.id, url);
      const canonicalAssetPath = createCanonicalAssetPath({
        folderNames: hierarchy
          .getPath(asset.folderId)
          .map((folder) => folder.name),
        name: formatAssetName(asset),
      });
      const cgiAssetPath = createCanonicalAssetPath({
        folderNames: ["cgi", "asset"],
        name: asset.name,
      });
      const targetUrl = new URL(url, "https://webstudio.invalid");
      const assetPaths = [
        {
          id: asset.id,
          path: canonicalAssetPath,
        },
      ];
      if (
        canonicalAssetPath !== cgiAssetPath &&
        (targetUrl.pathname !== `/${cgiAssetPath}` ||
          targetUrl.origin !== "https://webstudio.invalid")
      ) {
        assetPaths.push({ id: asset.id, path: cgiAssetPath });
      }
      return assetPaths.filter(({ path }) => {
        const assetUrlPath = `${path}\0${url}`;
        if (assetUrlPaths.has(assetUrlPath)) {
          return false;
        }
        assetUrlPaths.add(assetUrlPath);
        return true;
      });
    })
  );
  return Object.fromEntries(
    Array.from(assetIdsByPath, ([path, assetId]) => {
      return [`/${path}`, urlsById.get(assetId)!];
    })
  );
};
