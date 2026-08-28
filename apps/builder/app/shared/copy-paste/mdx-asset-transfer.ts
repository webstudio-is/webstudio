import {
  createCanonicalAssetPath,
  MdxDocumentError,
  rewriteMdxAssetReferences,
} from "@webstudio-is/content-engine/mdx";
import {
  MarkdownAssetReferenceError,
  rewriteMarkdownAssetReferences,
} from "@webstudio-is/content-engine/markdown-assets";
import {
  JsonAssetReferenceError,
  rewriteJsonAssetReferences,
} from "@webstudio-is/content-engine";
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
import { updateAssetContent } from "~/builder/shared/assets/update-asset-content";

const getRootAssetPath = (asset: Asset) =>
  createCanonicalAssetPath({
    folderNames: [],
    name: formatAssetName(asset),
  });

export const rewriteTransferredDocumentAssetReferences = async ({
  sourceOrigin,
  projectId,
  sourceAssets,
  sourceAssetPaths = {},
  importedAssets,
  readSource = async (asset: Asset) => {
    const response = await builderFetch(getAssetUrl(asset, sourceOrigin));
    if (response.ok === false) {
      throw new Error(
        `Unable to read copied content Asset "${formatAssetName(asset)}"`
      );
    }
    return response.text();
  },
  writeSource = async (asset: Asset, source: string) => {
    if (isMdxFileAsset(asset) === false) {
      await updateAssetContent({ asset, content: source });
      return;
    }
    await openExternalContentAsset({ projectId, assetId: asset.id });
    await updateExternalContentAssetSource({
      projectId,
      assetId: asset.id,
      update: () => source,
    });
    await flushExternalContentAsset({ projectId, assetId: asset.id });
  },
}: {
  sourceOrigin: string;
  projectId: string;
  sourceAssets: readonly Asset[];
  sourceAssetPaths?: Readonly<Record<string, string>>;
  importedAssets: ReadonlyMap<Asset["id"], Asset>;
  readSource?: (asset: Asset) => Promise<string>;
  writeSource?: (asset: Asset, source: string) => Promise<void>;
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
    const format = sourceAsset.format.toLowerCase();
    if (
      (isMdxFileAsset(sourceAsset) === false &&
        (sourceAsset.type !== "file" ||
          (format !== "md" && format !== "json"))) ||
      imported === undefined ||
      imported.id === sourceAsset.id
    ) {
      continue;
    }
    const source = await readSource(sourceAsset);
    let rewritten: string;
    try {
      const rewrite =
        format === "mdx"
          ? rewriteMdxAssetReferences
          : format === "md"
            ? rewriteMarkdownAssetReferences
            : rewriteJsonAssetReferences;
      rewritten = await rewrite({
        source,
        sourcePath: assetPaths.get(sourceAsset.id)!,
        assetPaths,
        replacementPaths,
      });
    } catch (error) {
      if (
        error instanceof MdxDocumentError ||
        error instanceof MarkdownAssetReferenceError ||
        error instanceof JsonAssetReferenceError
      ) {
        skippedInvalidAssetIds.push(sourceAsset.id);
        continue;
      }
      throw error;
    }
    if (rewritten !== source) {
      await writeSource(imported, rewritten);
    }
  }
  return { skippedInvalidAssetIds };
};
