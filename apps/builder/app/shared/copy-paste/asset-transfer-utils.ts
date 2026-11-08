import {
  getAssetUrl,
  type Asset,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import { remapFragmentAssets } from "@webstudio-is/project-build/runtime";
import type { builderApi } from "../builder-api";

const assetTransferError =
  "Could not transfer assets from the source Webstudio deployment. Make sure it is reachable and try again.";

export const transferFragmentAssets = async ({
  sourceOrigin,
  projectId,
  fragments,
  importAssets,
}: {
  sourceOrigin: string | undefined;
  projectId: string;
  fragments: WebstudioFragment[];
  importAssets: typeof builderApi.importAssets;
}) => {
  if (fragments.every((fragment) => fragment.assets.length === 0)) {
    return {
      success: true,
      fragments: new Map(fragments.map((fragment) => [fragment, fragment])),
      assetIds: new Map<Asset["id"], Asset["id"]>(),
      assets: new Map<Asset["id"], Asset>(),
    } as const;
  }

  const assets = new Map(
    fragments.flatMap((fragment) =>
      fragment.assets.map((asset) => [asset.id, asset] as const)
    )
  );

  let importedAssets: Map<Asset["id"], Asset>;
  try {
    importedAssets = await importAssets(
      projectId,
      Array.from(assets.values(), (asset) => ({
        asset,
        url:
          sourceOrigin === undefined
            ? undefined
            : getAssetUrl(asset, sourceOrigin).href,
      }))
    );
  } catch {
    return { success: false, error: assetTransferError } as const;
  }
  if (importedAssets.size !== assets.size) {
    return { success: false, error: assetTransferError } as const;
  }

  const assetIds = new Map<Asset["id"], Asset["id"]>();
  for (const sourceAsset of assets.values()) {
    const importedAsset = importedAssets.get(sourceAsset.id);
    if (importedAsset === undefined) {
      throw new Error("Imported asset is missing");
    }
    assetIds.set(sourceAsset.id, importedAsset.id);
  }
  const transferredFragments = new Map(
    fragments.map((fragment) => [
      fragment,
      remapFragmentAssets(fragment, importedAssets),
    ])
  );
  return {
    success: true,
    fragments: transferredFragments,
    assetIds,
    assets: importedAssets,
  } as const;
};
