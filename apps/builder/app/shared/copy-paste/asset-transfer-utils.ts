import {
  getAssetUrl,
  type Asset,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import { produce } from "immer";
import { replaceAssetMutable } from "@webstudio-is/project-build/runtime";
import { builderApi } from "../builder-api";

const assetTransferError =
  "Could not transfer assets from the source Webstudio deployment. Make sure it is reachable and try again.";

export const transferFragmentAssets = async ({
  sourceOrigin,
  projectId,
  fragments,
  importAssets = builderApi.importAssets,
}: {
  sourceOrigin: string | undefined;
  projectId: string;
  fragments: WebstudioFragment[];
  importAssets?: typeof builderApi.importAssets;
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
  const transferredFragments = new Map<WebstudioFragment, WebstudioFragment>();
  for (const fragment of fragments) {
    const transferredFragment = produce(fragment, (draft) => {
      for (const sourceAsset of fragment.assets) {
        const importedAsset = importedAssets.get(sourceAsset.id);
        if (importedAsset === undefined) {
          throw new Error("Imported asset is missing");
        }
        assetIds.set(sourceAsset.id, importedAsset.id);
        replaceAssetMutable({
          props: draft.props,
          styles: draft.styles,
          replacement: {
            fromAssetId: sourceAsset.id,
            toAssetId: importedAsset.id,
            fromFontFamily:
              sourceAsset.type === "font" ? sourceAsset.meta.family : undefined,
            toFontFamily:
              importedAsset.type === "font"
                ? importedAsset.meta.family
                : undefined,
          },
        });
      }
      draft.assets = [];
    });
    transferredFragments.set(fragment, transferredFragment);
  }
  return {
    success: true,
    fragments: transferredFragments,
    assetIds,
    assets: importedAssets,
  } as const;
};
