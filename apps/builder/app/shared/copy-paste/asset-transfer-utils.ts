import {
  getAssetUrl,
  type Asset,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import { produce } from "immer";
import { traverseStyleValue } from "@webstudio-is/project-build/runtime";
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
  const transferredFragments = new Map<WebstudioFragment, WebstudioFragment>();
  for (const fragment of fragments) {
    const replacementIds = new Map<Asset["id"], Asset["id"]>();
    const replacementFontFamilies = new Map<string, string>();
    for (const sourceAsset of fragment.assets) {
      const importedAsset = importedAssets.get(sourceAsset.id);
      if (importedAsset === undefined) {
        throw new Error("Imported asset is missing");
      }
      assetIds.set(sourceAsset.id, importedAsset.id);
      if (
        sourceAsset.id === importedAsset.id &&
        (sourceAsset.type !== "font" ||
          importedAsset.type !== "font" ||
          sourceAsset.meta.family === importedAsset.meta.family)
      ) {
        continue;
      }
      // Keep the old replacement order if an imported ID is another source ID.
      if (sourceAsset.id !== importedAsset.id) {
        for (const [sourceId, currentId] of replacementIds) {
          if (currentId === sourceAsset.id) {
            replacementIds.set(sourceId, importedAsset.id);
          }
        }
        if (replacementIds.has(sourceAsset.id) === false) {
          replacementIds.set(sourceAsset.id, importedAsset.id);
        }
      }
      if (sourceAsset.type === "font" && importedAsset.type === "font") {
        const from = sourceAsset.meta.family;
        const to = importedAsset.meta.family;
        if (from === to) {
          continue;
        }
        for (const [original, current] of replacementFontFamilies) {
          if (current === from) {
            replacementFontFamilies.set(original, to);
          }
        }
        if (replacementFontFamilies.has(from) === false) {
          replacementFontFamilies.set(from, to);
        }
      }
    }
    const transferredFragment = produce(fragment, (draft) => {
      for (const prop of draft.props) {
        if (prop.type === "asset") {
          prop.value = replacementIds.get(prop.value) ?? prop.value;
        }
      }
      for (const style of draft.styles) {
        traverseStyleValue(style.value, (item) => {
          if (item.type === "image" && item.value.type === "asset") {
            item.value.value =
              replacementIds.get(item.value.value) ?? item.value.value;
          }
          if (item.type === "fontFamily") {
            const mapped = item.value.map(
              (family) => replacementFontFamilies.get(family) ?? family
            );
            if (mapped.some((family, index) => family !== item.value[index])) {
              item.value = mapped;
            }
          }
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
