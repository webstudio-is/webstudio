import {
  collectionConfigFilename,
  ContentCollectionError,
  contentEngineLimits,
  extractMarkdownFrontmatter,
  getCollectionTemplateValidationError,
  getCollectionValidationError,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
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

export const assertUniqueCollectionFilenames = (
  filenames: Iterable<string>
) => {
  const normalizedFilenames = new Set<string>();
  for (const filename of filenames) {
    const normalizedFilename = filename.toLowerCase();
    if (normalizedFilenames.has(normalizedFilename)) {
      throw new ContentCollectionError(
        `Collection folder contains duplicate filename "${filename}"`
      );
    }
    normalizedFilenames.add(normalizedFilename);
  }
};

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

const parseTemplate = async (asset: Asset, assetStore: AssetObjectReader) => {
  try {
    return await parseMdxDocument({
      source: decodeUtf8(await readAssetBytes(asset, assetStore)),
    });
  } catch (error) {
    if (error instanceof ContentCollectionError) {
      throw error;
    }
    const details = error instanceof Error ? `: ${error.message}` : "";
    throw new ContentCollectionError(
      `Collection template is invalid${details}`,
      {
        cause: error,
      }
    );
  }
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
}: {
  assets: readonly Asset[];
  folderId: string;
  assetStore: AssetObjectReader;
}): Promise<CollectionFolderDefinition> => {
  const siblings = getFolderAssets(assets, folderId);
  const configAssets = siblings.filter(
    (asset) => formatAssetName(asset) === collectionConfigFilename
  );
  if (configAssets.length !== 1) {
    throw new ContentCollectionError(
      "A collection folder must contain exactly one collection.json"
    );
  }
  const configAsset = configAssets[0];
  const config = parseCollectionConfig(
    decodeUtf8(await readAssetBytes(configAsset, assetStore))
  );
  if (
    siblings.some(
      (asset) => asset.id !== configAsset.id && isMdxFileAsset(asset) === false
    )
  ) {
    throw new ContentCollectionError("Move non-entry files into a subfolder");
  }
  const templates = siblings.filter(
    (asset) =>
      formatAssetName(asset) === config.template && isMdxFileAsset(asset)
  );
  if (templates.length === 0) {
    throw new ContentCollectionError(
      `Collection template "${config.template}" not found`
    );
  }
  if (templates.length !== 1) {
    throw new ContentCollectionError(
      `Collection template "${config.template}" is ambiguous`
    );
  }
  assertUniqueCollectionFilenames(siblings.map(formatAssetName));
  const templateAsset = templates[0];
  const template = await parseTemplate(templateAsset, assetStore);
  const templateError = getCollectionTemplateValidationError(
    config,
    template.frontmatter.properties
  );
  if (templateError !== undefined) {
    throw new ContentCollectionError(
      `Collection template "${config.template}": ${templateError}`
    );
  }
  for (const entryAsset of siblings) {
    if (
      entryAsset.id === configAsset.id ||
      entryAsset.id === templateAsset.id
    ) {
      continue;
    }
    let properties: Record<string, unknown>;
    try {
      properties = (
        await extractMarkdownFrontmatter(
          (
            await assetStore.readFile(entryAsset.name)
          ).data
        )
      ).properties;
    } catch (error) {
      const details = error instanceof Error ? `: ${error.message}` : "";
      throw new ContentCollectionError(
        `Collection entry "${formatAssetName(entryAsset)}" is invalid${details}`,
        { cause: error }
      );
    }
    const validationError = getCollectionValidationError(config, properties);
    if (validationError !== undefined) {
      throw new ContentCollectionError(
        `Collection entry "${formatAssetName(entryAsset)}": ${validationError}`
      );
    }
    if (
      properties[config.slugField] !==
      getAssetDisplayNameParts(entryAsset).basename
    ) {
      throw new ContentCollectionError(
        `Collection entry "${formatAssetName(entryAsset)}": The slug must match the entry filename`
      );
    }
  }
  return { configAsset, templateAsset };
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
