import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  collectionConfigFilename,
  ContentCollectionError,
  contentEngineLimits,
  getCollectionTemplateValidationError,
  parseCollectionConfig,
  type ContentCollectionConfig,
} from "@webstudio-is/content-engine";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
import { readAssetContentBytes } from "@webstudio-is/content-engine/asset-content-repository";
import { formatAssetName, isMdxFileAsset, type Asset } from "@webstudio-is/sdk";
import { $assets, $project } from "~/shared/sync/data-stores";
import { createBuilderHttpAssetContentRepository } from "./builder-mdx-content-repository.client";

export type ContentCollection =
  | Readonly<{
      status: "ready";
      folderId: string;
      configAsset: Asset;
      templateAsset: Asset;
      config: ContentCollectionConfig;
      templateProperties: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      status: "loading";
      folderId: string;
      configAsset: Asset;
    }>
  | Readonly<{
      status: "invalid";
      folderId: string;
      configAsset: Asset;
      templateAsset?: Asset;
      reservedAssets: readonly Asset[];
      repairAsset: Asset;
      message: string;
    }>;

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Collection configuration is invalid";

export const discoverContentCollections = async ({
  assets,
  readSource,
}: {
  assets: readonly Asset[];
  readSource: (asset: Asset) => Promise<string>;
}) => {
  const assetsByFolder = new Map<string, Asset[]>();
  for (const asset of assets) {
    if (asset.folderId === undefined) {
      continue;
    }
    const siblings = assetsByFolder.get(asset.folderId) ?? [];
    siblings.push(asset);
    assetsByFolder.set(asset.folderId, siblings);
  }
  const collections = new Map<string, ContentCollection>();
  for (const [folderId, siblings] of assetsByFolder) {
    const configAssets = siblings.filter(
      (asset) => formatAssetName(asset) === collectionConfigFilename
    );
    const configAsset = configAssets[0];
    if (configAsset === undefined) {
      continue;
    }
    let templateAsset: Asset | undefined;
    const reservedAssets = [...configAssets];
    let repairAsset = configAsset;
    try {
      if (configAssets.length !== 1) {
        throw new ContentCollectionError(
          "A collection folder must contain exactly one collection.json"
        );
      }
      const config = parseCollectionConfig(await readSource(configAsset));
      const configuredTemplateAssets = siblings.filter(
        (asset) =>
          formatAssetName(asset) === config.template && isMdxFileAsset(asset)
      );
      reservedAssets.push(...configuredTemplateAssets);
      const configuredTemplateAsset = configuredTemplateAssets[0];
      if (configuredTemplateAsset === undefined) {
        throw new ContentCollectionError(
          `Collection template "${config.template}" was not found`
        );
      }
      if (configuredTemplateAssets.length !== 1) {
        throw new ContentCollectionError(
          `Collection template "${config.template}" is ambiguous`
        );
      }
      templateAsset = configuredTemplateAsset;
      if (
        siblings.some(
          (asset) =>
            asset.id !== configAsset.id &&
            asset.id !== configuredTemplateAsset.id &&
            isMdxFileAsset(asset) === false
        )
      ) {
        throw new ContentCollectionError(
          "Move non-entry files into a subfolder"
        );
      }
      repairAsset = configuredTemplateAsset;
      const templateDocument = await parseMdxDocument({
        source: await readSource(configuredTemplateAsset),
      });
      const templateValidationError = getCollectionTemplateValidationError(
        config,
        templateDocument.frontmatter.properties
      );
      if (templateValidationError !== undefined) {
        throw new ContentCollectionError(
          `Entry template: ${templateValidationError}`
        );
      }
      collections.set(folderId, {
        status: "ready",
        folderId,
        configAsset,
        templateAsset: configuredTemplateAsset,
        config,
        templateProperties: templateDocument.frontmatter.properties,
      });
    } catch (error) {
      collections.set(folderId, {
        status: "invalid",
        folderId,
        configAsset,
        templateAsset,
        reservedAssets,
        repairAsset,
        message: getErrorMessage(error),
      });
    }
  }
  return collections;
};

const decodeUtf8 = (bytes: Uint8Array) => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ContentCollectionError("Collection file is not valid UTF-8");
  }
};

export const readBuilderAssetSource = async ({
  projectId,
  assetId,
}: {
  projectId: string;
  assetId: string;
}) => {
  const repository = createBuilderHttpAssetContentRepository({ projectId });
  const { bytes } = await readAssetContentBytes({
    repository,
    assetId,
    maxSize: contentEngineLimits.hydratedFileBytes,
  });
  return decodeUtf8(bytes);
};

export const useContentCollections = () => {
  const assets = useStore($assets);
  const project = useStore($project);
  const configAssets = useMemo(
    () =>
      Array.from(assets.values()).filter(
        (asset) =>
          asset.folderId !== undefined &&
          formatAssetName(asset) === collectionConfigFilename
      ),
    [assets]
  );
  const [collections, setCollections] = useState<
    ReadonlyMap<string, ContentCollection>
  >(new Map());

  useEffect(() => {
    let cancelled = false;
    const loading = new Map<string, ContentCollection>();
    for (const configAsset of configAssets) {
      loading.set(configAsset.folderId!, {
        status: "loading",
        folderId: configAsset.folderId!,
        configAsset,
      });
    }
    setCollections(loading);
    if (project === undefined || configAssets.length === 0) {
      return () => {
        cancelled = true;
      };
    }
    void discoverContentCollections({
      assets: Array.from(assets.values()),
      readSource: async (asset) => {
        return readBuilderAssetSource({
          projectId: project.id,
          assetId: asset.id,
        });
      },
    }).then((result) => {
      if (cancelled === false) {
        setCollections(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [assets, configAssets, project]);

  return collections;
};

export const getCollectionReservedAssetIds = (
  collections: ReadonlyMap<string, ContentCollection>,
  { includeInvalid = false }: { includeInvalid?: boolean } = {}
) =>
  new Set(
    Array.from(collections.values()).flatMap((collection) =>
      collection.status === "invalid"
        ? includeInvalid
          ? [...collection.reservedAssets.map(({ id }) => id)]
          : []
        : [
            collection.configAsset.id,
            ...(collection.status === "ready"
              ? [collection.templateAsset.id]
              : []),
          ]
    )
  );
