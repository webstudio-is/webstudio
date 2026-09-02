import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  collectionConfigFilename,
  ContentCollectionError,
  contentEngineLimits,
  parseCollectionConfig,
  type ContentCollectionConfig,
} from "@webstudio-is/content-engine";
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
    const configAsset = siblings.find(
      (asset) => formatAssetName(asset) === collectionConfigFilename
    );
    if (configAsset === undefined) {
      continue;
    }
    try {
      const config = parseCollectionConfig(await readSource(configAsset));
      const templateAsset = siblings.find(
        (asset) =>
          formatAssetName(asset) === config.template && isMdxFileAsset(asset)
      );
      if (templateAsset === undefined) {
        throw new ContentCollectionError(
          `Collection template "${config.template}" was not found`
        );
      }
      if (
        siblings.some(
          (asset) =>
            asset.id !== configAsset.id &&
            asset.id !== templateAsset.id &&
            isMdxFileAsset(asset) === false
        )
      ) {
        throw new ContentCollectionError(
          "Move non-entry files into a subfolder"
        );
      }
      collections.set(folderId, {
        status: "ready",
        folderId,
        configAsset,
        templateAsset,
        config,
      });
    } catch (error) {
      collections.set(folderId, {
        status: "invalid",
        folderId,
        configAsset,
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
  collections: ReadonlyMap<string, ContentCollection>
) =>
  new Set(
    Array.from(collections.values()).flatMap((collection) =>
      collection.status === "invalid"
        ? []
        : [
            collection.configAsset.id,
            ...(collection.status === "ready"
              ? [collection.templateAsset.id]
              : []),
          ]
    )
  );
