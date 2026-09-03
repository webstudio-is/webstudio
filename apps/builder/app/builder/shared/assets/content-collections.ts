import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  collectionConfigFilename,
  ContentCollectionError,
  contentEngineLimits,
  extractMarkdownFrontmatter,
  getCollectionValidationError,
  getCollectionTemplateValidationError,
  parseCollectionConfig,
  type ContentCollectionConfig,
} from "@webstudio-is/content-engine";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
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
      reservedAssets: readonly Asset[];
      siblingAssets: readonly Asset[];
    }>
  | Readonly<{
      status: "invalid";
      folderId: string;
      configAsset: Asset;
      templateAsset?: Asset;
      reservedAssets: readonly Asset[];
      repairAsset: Asset;
      missingTemplateFilename?: string;
      forbiddenAsset?: Asset;
      editorRepair?: Readonly<{
        action: "edit" | "move";
        asset: Asset;
      }>;
      message: string;
    }>;

export const canConfigureContentCollections = (authPermit: AuthPermit) =>
  authPermit === "build" || authPermit === "admin" || authPermit === "own";

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Collection configuration is invalid";

export const discoverContentCollections = async ({
  assets,
  readSource,
  readFrontmatter,
}: {
  assets: readonly Asset[];
  readSource: (asset: Asset) => Promise<string>;
  readFrontmatter?: (
    asset: Asset
  ) => Promise<Readonly<Record<string, unknown>>>;
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
    let reservedAssets = [...configAssets, ...siblings.filter(isMdxFileAsset)];
    let repairAsset = configAsset;
    let missingTemplateFilename: string | undefined;
    let forbiddenAsset: Asset | undefined;
    let editorRepair:
      | Readonly<{ action: "edit" | "move"; asset: Asset }>
      | undefined;
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
      const configuredTemplateAsset = configuredTemplateAssets[0];
      if (configuredTemplateAsset === undefined) {
        missingTemplateFilename = config.template;
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
      reservedAssets = [configAsset, configuredTemplateAsset];
      forbiddenAsset = siblings.find(
        (asset) =>
          asset.id !== configAsset.id &&
          asset.id !== configuredTemplateAsset.id &&
          isMdxFileAsset(asset) === false
      );
      if (forbiddenAsset !== undefined) {
        editorRepair = { action: "move", asset: forbiddenAsset };
        throw new ContentCollectionError(
          `Move "${formatAssetName(forbiddenAsset)}" into a subfolder`
        );
      }
      const filenames = new Set<string>();
      for (const asset of siblings) {
        const filename = formatAssetName(asset);
        const normalizedFilename = filename.toLowerCase();
        if (filenames.has(normalizedFilename)) {
          repairAsset = asset;
          if (
            asset.id !== configAsset.id &&
            asset.id !== configuredTemplateAsset.id
          ) {
            editorRepair = { action: "move", asset };
          }
          throw new ContentCollectionError(
            `Collection folder contains duplicate filename "${filename}"`
          );
        }
        filenames.add(normalizedFilename);
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
      const entryAssets = siblings.filter(
        (asset) =>
          asset.id !== configAsset.id && asset.id !== configuredTemplateAsset.id
      );
      for (
        let index = 0;
        index < entryAssets.length;
        index += contentEngineLimits.concurrentContentReads
      ) {
        const results = await Promise.all(
          entryAssets
            .slice(index, index + contentEngineLimits.concurrentContentReads)
            .map(async (entryAsset) => {
              try {
                const properties =
                  readFrontmatter === undefined
                    ? (
                        await extractMarkdownFrontmatter(
                          await readSource(entryAsset)
                        )
                      ).properties
                    : await readFrontmatter(entryAsset);
                const validationError = getCollectionValidationError(
                  config,
                  properties
                );
                if (validationError !== undefined) {
                  return {
                    entryAsset,
                    message: `Collection entry "${formatAssetName(
                      entryAsset
                    )}": ${validationError}`,
                  };
                }
                if (
                  properties[config.slugField] !==
                  getAssetDisplayNameParts(entryAsset).basename
                ) {
                  return {
                    entryAsset,
                    message: `Collection entry "${formatAssetName(
                      entryAsset
                    )}": The slug must match the entry filename`,
                  };
                }
              } catch (error) {
                const details =
                  error instanceof Error ? `: ${error.message}` : "";
                return {
                  entryAsset,
                  message: `Collection entry "${formatAssetName(
                    entryAsset
                  )}" is invalid${details}`,
                };
              }
            })
        );
        const failure = results.find((result) => result !== undefined);
        if (failure !== undefined) {
          repairAsset = failure.entryAsset;
          editorRepair = { action: "edit", asset: failure.entryAsset };
          throw new ContentCollectionError(failure.message);
        }
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
        missingTemplateFilename,
        forbiddenAsset,
        editorRepair,
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

// Frontmatter extraction needs only the bounded opening block. The small
// allowance covers its optional byte-order mark and delimiter lines.
const builderFrontmatterReadBytes = contentEngineLimits.frontmatterBytes + 64;

export const readBuilderAssetFrontmatter = async ({
  projectId,
  asset,
}: {
  projectId: string;
  asset: Asset;
}) => {
  const repository = createBuilderHttpAssetContentRepository({ projectId });
  const content = await repository.readContent({
    assetId: asset.id,
    range: {
      offset: 0,
      length: Math.min(asset.size, builderFrontmatterReadBytes),
    },
  });
  return (await extractMarkdownFrontmatter(content.data)).properties;
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
  const collections = new Map<string, ContentCollection>();
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
      reservedAssets: [
        ...siblings.filter(
          (asset) =>
            formatAssetName(asset) === collectionConfigFilename ||
            isMdxFileAsset(asset)
        ),
      ],
    });
  }
  return collections;
};

const canKeepReadyCollection = (
  current: ContentCollection,
  loading: Extract<ContentCollection, { status: "loading" }>
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
        canKeepReadyCollection(previous, next)
        ? previous
        : next
    );
  }
  return merged;
};

const mergeDiscoveredContentCollections = ({
  current,
  discovered,
}: {
  current: ReadonlyMap<string, ContentCollection>;
  discovered: ReadonlyMap<string, ContentCollection>;
}) => {
  const merged = new Map<string, ContentCollection>();
  for (const [folderId, next] of discovered) {
    const previous = current.get(folderId);
    if (
      previous?.status === "ready" &&
      next.status === "ready" &&
      hasSameAssetVersion(previous.configAsset, next.configAsset) &&
      hasSameAssetVersion(previous.templateAsset, next.templateAsset)
    ) {
      merged.set(folderId, previous);
    } else {
      merged.set(folderId, next);
    }
  }
  return merged;
};

export const useContentCollections = (refreshKey = 0) => {
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

  useEffect(() => {
    let cancelled = false;
    if (project === undefined || loadingCollections.size === 0) {
      return () => {
        cancelled = true;
      };
    }
    void discoverContentCollections({
      assets: assetList,
      readSource: async (asset) => {
        return readBuilderAssetSource({
          projectId: project.id,
          assetId: asset.id,
        });
      },
      readFrontmatter: async (asset) =>
        readBuilderAssetFrontmatter({ projectId: project.id, asset }),
    }).then((result) => {
      if (cancelled === false) {
        setDiscoveredCollections((current) =>
          mergeDiscoveredContentCollections({ current, discovered: result })
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [assetList, loadingCollections, project, refreshKey]);

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
        : collection.status === "loading"
          ? [
              collection.configAsset.id,
              ...(includeInvalid
                ? collection.reservedAssets.map(({ id }) => id)
                : []),
            ]
          : [collection.configAsset.id, collection.templateAsset.id]
    )
  );
