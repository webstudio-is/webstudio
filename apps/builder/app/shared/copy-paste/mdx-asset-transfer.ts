import {
  createCanonicalAssetPath,
  MdxDocumentError,
  rewriteMdxAssetReferences,
} from "@webstudio-is/content-engine/mdx";
import {
  formatAssetName,
  getAssetUrl,
  isMdxFileAsset,
  type Asset,
} from "@webstudio-is/sdk";
import { fetch as builderFetch } from "../fetch.client";
import {
  flushExternalContentAsset,
  openExternalContentAsset,
  updateExternalContentAssetSource,
} from "../external-content-roots";

const getRootAssetPath = (asset: Asset) =>
  createCanonicalAssetPath({
    folderNames: [],
    name: formatAssetName(asset),
  });

export const rewriteTransferredMdxAssets = async ({
  sourceOrigin,
  projectId,
  sourceAssets,
  sourceAssetPaths = {},
  importedAssets,
  readSource = async (asset: Asset) => {
    const response = await builderFetch(getAssetUrl(asset, sourceOrigin));
    if (response.ok === false) {
      throw new Error(
        `Unable to read copied MDX Asset "${formatAssetName(asset)}"`
      );
    }
    return response.text();
  },
  writeSource = async (assetId: string, source: string) => {
    await openExternalContentAsset({ projectId, assetId });
    await updateExternalContentAssetSource({
      projectId,
      assetId,
      update: () => source,
    });
    await flushExternalContentAsset({ projectId, assetId });
  },
}: {
  sourceOrigin: string;
  projectId: string;
  sourceAssets: readonly Asset[];
  sourceAssetPaths?: Readonly<Record<string, string>>;
  importedAssets: ReadonlyMap<Asset["id"], Asset>;
  readSource?: (asset: Asset) => Promise<string>;
  writeSource?: (assetId: string, source: string) => Promise<void>;
}) => {
  const assetPaths = new Map(
    sourceAssets.map((asset) => [
      asset.id,
      sourceAssetPaths[asset.id] ?? getRootAssetPath(asset),
    ])
  );
  const replacementPaths = new Map(
    sourceAssets.flatMap((asset) => {
      const imported = importedAssets.get(asset.id);
      return imported === undefined
        ? []
        : ([[asset.id, getRootAssetPath(imported)]] as const);
    })
  );
  const skippedInvalidAssetIds: string[] = [];
  for (const sourceAsset of sourceAssets) {
    const imported = importedAssets.get(sourceAsset.id);
    if (
      isMdxFileAsset(sourceAsset) === false ||
      imported === undefined ||
      imported.id === sourceAsset.id
    ) {
      continue;
    }
    const source = await readSource(sourceAsset);
    let rewritten: string;
    try {
      rewritten = await rewriteMdxAssetReferences({
        source,
        sourcePath: assetPaths.get(sourceAsset.id)!,
        assetPaths,
        replacementPaths,
      });
    } catch (error) {
      if (error instanceof MdxDocumentError) {
        skippedInvalidAssetIds.push(sourceAsset.id);
        continue;
      }
      throw error;
    }
    if (rewritten !== source) {
      await writeSource(imported.id, rewritten);
    }
  }
  return { skippedInvalidAssetIds };
};
