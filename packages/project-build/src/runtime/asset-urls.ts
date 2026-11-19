import { createUniqueAssetIdsByPath } from "@webstudio-is/content-engine";
import { createCanonicalAssetPath } from "@webstudio-is/content-engine/mdx";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  isResizableImageFileName,
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
  const canonicalPaths = new Set<string>();
  const cgiAliases = new Map<string, { id: string; path: string }>();
  const assetIdsByPath = createUniqueAssetIdsByPath(
    Array.from(assets, (asset) => {
      const url = getUrl(asset);
      urlsById.set(asset.id, url);
      const canonicalAssetPath = createCanonicalAssetPath({
        folderNames: hierarchy
          .getPath(asset.folderId)
          .map((folder) => folder.name),
        name: formatAssetName(asset),
      });
      canonicalPaths.add(canonicalAssetPath);
      const cgiAssetPath = createCanonicalAssetPath({
        folderNames: ["cgi", "asset"],
        name: asset.name,
      });
      const targetUrl = new URL(url, "https://webstudio.invalid");
      if (
        isResizableImageFileName(asset.name) === false &&
        (targetUrl.pathname !== `/${cgiAssetPath}` ||
          targetUrl.origin !== "https://webstudio.invalid")
      ) {
        cgiAliases.set(`${cgiAssetPath}\0${url}`, {
          id: asset.id,
          path: cgiAssetPath,
        });
      }
      return { id: asset.id, path: canonicalAssetPath };
    })
  );
  for (const [path, id] of createUniqueAssetIdsByPath(cgiAliases.values())) {
    // Ambiguous canonical paths still reserve the path.
    if (canonicalPaths.has(path) === false) {
      assetIdsByPath.set(path, id);
    }
  }
  return Object.fromEntries(
    Array.from(assetIdsByPath, ([path, assetId]) => {
      return [`/${path}`, urlsById.get(assetId)!];
    })
  );
};
