import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  collectionConfigFilename,
  ContentCollectionError,
  ContentCollectionInspectionError,
  contentEngineLimits,
  inspectContentCollection,
  type ContentCollectionConfig,
} from "@webstudio-is/content-engine";
import { readAssetContentBytes } from "@webstudio-is/content-engine/asset-content-repository";
import {
  formatAssetName,
  getAssetDisplayNameParts,
  isMdxFileAsset,
  type Asset,
} from "@webstudio-is/sdk";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
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
      siblingAssets: readonly Asset[];
    }>
  | Readonly<{
      status: "invalid";
      folderId: string;
      configAsset: Asset;
      templateAsset?: Asset;
      reservedAssets: readonly Asset[];
      siblingAssets: readonly Asset[];
      repairAsset: Asset;
      missingTemplateFilename?: string;
      forbiddenAsset?: Asset;
      repairAction?: "edit" | "move";
      message: string;
    }>
  | Readonly<{
      status: "unavailable";
      folderId: string;
      configAsset: Asset;
      templateAsset?: Asset;
      reservedAssets: readonly Asset[];
      siblingAssets: readonly Asset[];
      message: string;
    }>;

type LoadingContentCollection = Extract<
  ContentCollection,
  { status: "loading" }
>;

export const canConfigureContentCollections = (authPermit: AuthPermit) =>
  authPermit === "build" || authPermit === "admin" || authPermit === "own";

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Collection configuration is invalid";

export class ContentCollectionReadError extends Error {}

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
  const readCollectionSource = async (asset: Asset) => {
    if (asset.size > contentEngineLimits.hydratedFileBytes) {
      throw new ContentCollectionError(
        `Collection file "${formatAssetName(asset)}" exceeds the editing limit`
      );
    }
    try {
      return await readSource(asset);
    } catch (error) {
      if (error instanceof ContentCollectionError) {
        throw error;
      }
      throw new ContentCollectionReadError(getErrorMessage(error));
    }
  };
  for (const [folderId, siblings] of assetsByFolder) {
    const configAssets = siblings.filter(
      (asset) => formatAssetName(asset) === collectionConfigFilename
    );
    const configAsset = configAssets[0];
    if (configAsset === undefined) {
      continue;
    }
    let templateAsset: Asset | undefined;
    let reservedAssets = [...configAssets, ...siblings.filter(isMdxFileAsset)];
    let repairAsset = configAsset;
    let missingTemplateFilename: string | undefined;
    let forbiddenAsset: Asset | undefined;
    let repairAction: "edit" | "move" | undefined;
    try {
      const inspected = await inspectContentCollection({
        files: siblings.map((asset) => ({
          file: asset,
          id: asset.id,
          filename: formatAssetName(asset),
          basename: getAssetDisplayNameParts(asset).basename,
          isMdx: isMdxFileAsset(asset),
        })),
        readSource: ({ file }) => readCollectionSource(file),
        validateEntries: false,
      });
      templateAsset = inspected.templateFile.file;
      reservedAssets = [configAsset, templateAsset];
      collections.set(folderId, {
        status: "ready",
        folderId,
        configAsset,
        templateAsset,
        config: inspected.config,
        templateProperties: inspected.templateProperties,
      });
    } catch (error) {
      if (error instanceof ContentCollectionReadError) {
        collections.set(folderId, {
          status: "unavailable",
          folderId,
          configAsset,
          templateAsset,
          reservedAssets,
          siblingAssets: siblings,
          message: `Collection files could not be loaded: ${error.message}`,
        });
        continue;
      }
      if (error instanceof ContentCollectionInspectionError) {
        repairAsset =
          siblings.find((asset) => asset.id === error.fileId) ?? configAsset;
        templateAsset =
          siblings.find((asset) => asset.id === error.templateFileId) ??
          (repairAsset.id !== configAsset.id && isMdxFileAsset(repairAsset)
            ? repairAsset
            : undefined);
        if (templateAsset !== undefined) {
          const templateFilename = formatAssetName(templateAsset);
          reservedAssets = [
            configAsset,
            ...siblings.filter(
              (asset) =>
                isMdxFileAsset(asset) &&
                formatAssetName(asset) === templateFilename
            ),
          ];
        }
        missingTemplateFilename = error.missingTemplateFilename;
        forbiddenAsset =
          error.forbiddenFileId === undefined
            ? undefined
            : siblings.find((asset) => asset.id === error.forbiddenFileId);
        repairAction = error.repairAction;
      }
      collections.set(folderId, {
        status: "invalid",
        folderId,
        configAsset,
        templateAsset,
        reservedAssets,
        siblingAssets: siblings,
        repairAsset,
        missingTemplateFilename,
        forbiddenAsset,
        repairAction,
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

const hasSameAssetVersion = (left: Asset, right: Asset) =>
  left.id === right.id &&
  left.projectId === right.projectId &&
  left.folderId === right.folderId &&
  left.name === right.name &&
  left.filename === right.filename &&
  left.format === right.format &&
  left.size === right.size &&
  left.updatedAt === right.updatedAt;

const hasSameAssetVersions = (
  left: readonly Asset[],
  right: readonly Asset[]
) => {
  if (left.length !== right.length) {
    return false;
  }
  const rightById = new Map(right.map((asset) => [asset.id, asset]));
  return left.every((asset) => {
    const candidate = rightById.get(asset.id);
    return candidate !== undefined && hasSameAssetVersion(asset, candidate);
  });
};

export const createLoadingContentCollections = (assets: readonly Asset[]) => {
  const assetsByFolder = new Map<string, Asset[]>();
  for (const asset of assets) {
    if (asset.folderId === undefined) {
      continue;
    }
    const siblings = assetsByFolder.get(asset.folderId) ?? [];
    siblings.push(asset);
    assetsByFolder.set(asset.folderId, siblings);
  }
  const collections = new Map<string, LoadingContentCollection>();
  for (const [folderId, siblings] of assetsByFolder) {
    const configAsset = siblings.find(
      (asset) => formatAssetName(asset) === collectionConfigFilename
    );
    if (configAsset === undefined) {
      continue;
    }
    collections.set(folderId, {
      status: "loading",
      folderId,
      configAsset,
      siblingAssets: siblings,
    });
  }
  return collections;
};

const canKeepReadyCollection = (
  current: ContentCollection,
  loading: LoadingContentCollection
) => {
  if (
    current.status !== "ready" ||
    hasSameAssetVersion(current.configAsset, loading.configAsset) === false
  ) {
    return false;
  }
  const currentTemplate = loading.siblingAssets.find(
    (asset) => asset.id === current.templateAsset.id
  );
  if (
    currentTemplate === undefined ||
    hasSameAssetVersion(current.templateAsset, currentTemplate) === false
  ) {
    return false;
  }
  return loading.siblingAssets.every(
    (asset) =>
      asset.id === current.configAsset.id ||
      asset.id === current.templateAsset.id ||
      isMdxFileAsset(asset)
  );
};

const canKeepDiscoveredCollection = (
  current: ContentCollection,
  loading: LoadingContentCollection
) => {
  if (current.status === "invalid" || current.status === "unavailable") {
    return hasSameAssetVersions(current.siblingAssets, loading.siblingAssets);
  }
  return canKeepReadyCollection(current, loading);
};

export const mergeLoadingContentCollections = ({
  current,
  loading,
}: {
  current: ReadonlyMap<string, ContentCollection>;
  loading: ReadonlyMap<string, ContentCollection>;
}) => {
  const merged = new Map<string, ContentCollection>();
  for (const [folderId, next] of loading) {
    const previous = current.get(folderId);
    merged.set(
      folderId,
      next.status === "loading" &&
        previous !== undefined &&
        canKeepDiscoveredCollection(previous, next)
        ? previous
        : next
    );
  }
  return merged;
};

export const useContentCollections = (
  activeFolderId: string | undefined,
  refreshKey = 0
) => {
  const assets = useStore($assets);
  const project = useStore($project);
  const assetList = useMemo(() => Array.from(assets.values()), [assets]);
  const loadingCollections = useMemo(
    () => createLoadingContentCollections(assetList),
    [assetList]
  );
  const [discoveredCollections, setDiscoveredCollections] = useState<
    ReadonlyMap<string, ContentCollection>
  >(() => new Map());
  const collections = useMemo(
    () =>
      mergeLoadingContentCollections({
        current: discoveredCollections,
        loading: loadingCollections,
      }),
    [discoveredCollections, loadingCollections]
  );
  const activeCollection =
    activeFolderId === undefined
      ? undefined
      : loadingCollections.get(activeFolderId);
  const activeCollectionVersion =
    activeCollection !== undefined
      ? JSON.stringify(
          activeCollection.siblingAssets
            .map((asset) => [
              asset.id,
              asset.name,
              asset.filename,
              asset.format,
              asset.size,
              asset.updatedAt,
            ])
            .sort(([left], [right]) =>
              String(left).localeCompare(String(right))
            )
        )
      : undefined;
  const projectId = project?.id;

  useEffect(() => {
    let cancelled = false;
    if (
      projectId === undefined ||
      activeFolderId === undefined ||
      activeCollectionVersion === undefined
    ) {
      return () => {
        cancelled = true;
      };
    }
    const activeAssets = Array.from($assets.get().values()).filter(
      (asset) => asset.folderId === activeFolderId
    );
    void discoverContentCollections({
      assets: activeAssets,
      readSource: async (asset) => {
        return readBuilderAssetSource({
          projectId,
          assetId: asset.id,
        });
      },
    }).then((result) => {
      if (cancelled === false) {
        setDiscoveredCollections((current) => {
          const next = new Map(current);
          for (const [folderId, collection] of result) {
            const previous = current.get(folderId);
            if (
              previous?.status === "ready" &&
              collection.status === "ready" &&
              hasSameAssetVersion(
                previous.configAsset,
                collection.configAsset
              ) &&
              hasSameAssetVersion(
                previous.templateAsset,
                collection.templateAsset
              )
            ) {
              continue;
            }
            next.set(folderId, collection);
          }
          return next;
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeCollectionVersion, activeFolderId, projectId, refreshKey]);

  return collections;
};

export const getCollectionReservedAssetIds = (
  collections: ReadonlyMap<string, ContentCollection>,
  { includeInvalid = false }: { includeInvalid?: boolean } = {}
) =>
  new Set(
    Array.from(collections.values()).flatMap((collection) =>
      collection.status === "invalid" || collection.status === "unavailable"
        ? includeInvalid
          ? [...collection.reservedAssets.map(({ id }) => id)]
          : []
        : collection.status === "loading"
          ? [
              collection.configAsset.id,
              ...(includeInvalid
                ? collection.siblingAssets.flatMap((asset) =>
                    formatAssetName(asset) === collectionConfigFilename ||
                    isMdxFileAsset(asset)
                      ? [asset.id]
                      : []
                  )
                : []),
            ]
          : [collection.configAsset.id, collection.templateAsset.id]
    )
  );
