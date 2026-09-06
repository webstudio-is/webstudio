import {
  collectionConfigFilename,
  ContentCollectionError,
  contentEngineLimits,
  extractMarkdownFrontmatter,
  inspectContentCollection,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import {
  decodeUtf8,
  readBoundedBytes,
} from "@webstudio-is/content-engine/compiler";
import {
  formatAssetName,
  getAssetDisplayNameParts,
  isMdxFileAsset,
  type Asset,
} from "@webstudio-is/sdk";
import type { AssetObjectReader } from "./client";

export type CollectionFolderDefinition = Readonly<{
  configAsset: Asset;
  templateAsset: Asset;
}>;

const getFolderAssets = (assets: readonly Asset[], folderId: string) =>
  assets.filter((asset) => asset.folderId === folderId);

const readAssetBytes = async (asset: Asset, assetStore: AssetObjectReader) => {
  if (asset.size > contentEngineLimits.hydratedFileBytes) {
    throw new ContentCollectionError(
      `Collection file "${formatAssetName(asset)}" exceeds the content size limit`
    );
  }
  const response = await assetStore.readFile(asset.name);
  const bytes = await readBoundedBytes(
    response.data,
    contentEngineLimits.hydratedFileBytes
  );
  if (bytes.byteLength !== asset.size) {
    throw new ContentCollectionError(
      `Collection file "${formatAssetName(asset)}" content length does not match its metadata`
    );
  }
  return bytes;
};

export const getCollectionFolderIds = (assets: readonly Asset[]) =>
  new Set(
    assets.flatMap((asset) =>
      asset.folderId !== undefined &&
      formatAssetName(asset) === collectionConfigFilename
        ? [asset.folderId]
        : []
    )
  );

export const validateCollectionFolder = async ({
  assets,
  folderId,
  assetStore,
  validateTemplate = true,
  validateEntries = true,
}: {
  assets: readonly Asset[];
  folderId: string;
  assetStore: AssetObjectReader;
  validateTemplate?: boolean;
  validateEntries?: boolean;
}): Promise<CollectionFolderDefinition> => {
  const siblings = getFolderAssets(assets, folderId);
  const result = await inspectContentCollection({
    files: siblings.map((asset) => ({
      file: asset,
      id: asset.id,
      filename: formatAssetName(asset),
      basename: getAssetDisplayNameParts(asset).basename,
      isMdx: isMdxFileAsset(asset),
    })),
    readSource: async ({ file }) =>
      decodeUtf8(await readAssetBytes(file, assetStore)),
    readFrontmatter: async ({ file }) =>
      (
        await extractMarkdownFrontmatter(
          (
            await assetStore.readFile(file.name)
          ).data
        )
      ).properties,
    validateTemplate,
    validateEntries,
  });
  return {
    configAsset: result.configFile.file,
    templateAsset: result.templateFile.file,
  };
};

const readConfiguredTemplateName = async (
  configAsset: Asset,
  assetStore: AssetObjectReader
) => {
  try {
    const source = decodeUtf8(await readAssetBytes(configAsset, assetStore));
    try {
      return parseCollectionConfig(source).template;
    } catch {
      const value = JSON.parse(source) as unknown;
      if (
        typeof value === "object" &&
        value !== null &&
        typeof (value as Record<string, unknown>)["x-webstudio"] === "object" &&
        (value as Record<string, unknown>)["x-webstudio"] !== null
      ) {
        const template = (
          (value as Record<string, unknown>)["x-webstudio"] as Record<
            string,
            unknown
          >
        ).template;
        if (typeof template === "string") {
          return template;
        }
      }
    }
  } catch {
    // The caller conservatively reserves every MDX sibling when the configured
    // template cannot be identified from a broken manifest.
  }
  return;
};

export const getCollectionReservedAssetIds = async ({
  assets,
  assetStore,
  folderIds,
}: {
  assets: readonly Asset[];
  assetStore: AssetObjectReader;
  folderIds?: ReadonlySet<string>;
}) => {
  const reservedIds = new Set<string>();
  for (const folderId of getCollectionFolderIds(assets)) {
    if (folderIds !== undefined && folderIds.has(folderId) === false) {
      continue;
    }
    const siblings = getFolderAssets(assets, folderId);
    const configAssets = siblings.filter(
      (asset) => formatAssetName(asset) === collectionConfigFilename
    );
    for (const configAsset of configAssets) {
      reservedIds.add(configAsset.id);
    }
    if (configAssets.length !== 1) {
      for (const asset of siblings.filter(isMdxFileAsset)) {
        reservedIds.add(asset.id);
      }
      continue;
    }
    const templateName = await readConfiguredTemplateName(
      configAssets[0],
      assetStore
    );
    if (templateName === undefined) {
      for (const asset of siblings.filter(isMdxFileAsset)) {
        reservedIds.add(asset.id);
      }
      continue;
    }
    for (const asset of siblings) {
      if (formatAssetName(asset) === templateName && isMdxFileAsset(asset)) {
        reservedIds.add(asset.id);
      }
    }
  }
  return reservedIds;
};
