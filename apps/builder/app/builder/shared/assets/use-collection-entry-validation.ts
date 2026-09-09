import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  contentEngineLimits,
  extractMarkdownFrontmatter,
  getCollectionEntryValidationIssues,
} from "@webstudio-is/content-engine";
import {
  formatAssetName,
  getAssetDisplayNameParts,
  type Asset,
} from "@webstudio-is/sdk";
import { $assets } from "~/shared/sync/data-stores";
import type { ContentCollection } from "./content-collections";
import { createBuilderHttpAssetContentRepository } from "./builder-mdx-content-repository.client";

export type CollectionEntryIssue = {
  fieldKey?: string;
  message: string;
};
type CachedFrontmatter = {
  name: string;
  properties: Readonly<Record<string, unknown>>;
};

export const checkCollectionEntries = async ({
  collection,
  assets,
  cache,
  readFrontmatter,
  cancelled,
}: {
  collection: Extract<ContentCollection, { status: "ready" }>;
  assets: readonly Asset[];
  cache: Map<string, CachedFrontmatter>;
  readFrontmatter: (asset: Asset) => Promise<Readonly<Record<string, unknown>>>;
  cancelled: () => boolean;
}) => {
  const issues = new Map<string, readonly CollectionEntryIssue[]>();
  const entries = assets.filter(
    (asset) =>
      asset.folderId === collection.folderId &&
      collection.config.matchesEntry(formatAssetName(asset))
  );
  const remaining = entries.values();
  const worker = async () => {
    for (const asset of remaining) {
      if (cancelled()) {
        return;
      }
      try {
        const cached = cache.get(asset.id);
        const properties =
          cached?.name === asset.name
            ? cached.properties
            : await readFrontmatter(asset);
        if (cancelled()) {
          return;
        }
        cache.set(asset.id, { name: asset.name, properties });
        const entryIssues = getCollectionEntryValidationIssues({
          config: collection.config,
          properties,
          basename: getAssetDisplayNameParts(asset).basename,
        });
        if (entryIssues.length > 0) {
          issues.set(asset.id, entryIssues);
        }
      } catch {
        if (cancelled()) {
          return;
        }
        issues.set(asset.id, [
          {
            message:
              "This entry could not be checked. Open the file to inspect it or retry the check.",
          },
        ]);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(4, entries.length) }, worker)
  );
  if (cancelled()) {
    return issues;
  }
  const entryIds = new Set(entries.map((asset) => asset.id));
  for (const id of cache.keys()) {
    if (!entryIds.has(id)) {
      cache.delete(id);
    }
  }
  return issues;
};

export const useCollectionEntryValidation = (
  collection: ContentCollection | undefined
) => {
  const assets = useStore($assets);
  const folderId = collection?.folderId;
  const projectId = collection?.configAsset.projectId;
  const cacheRef = useRef({
    folderId,
    projectId,
    entries: new Map<string, CachedFrontmatter>(),
  });
  if (
    cacheRef.current.folderId !== folderId ||
    cacheRef.current.projectId !== projectId
  ) {
    cacheRef.current = { folderId, projectId, entries: new Map() };
  }
  const cache = cacheRef.current.entries;
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    collection: ContentCollection;
    assets: typeof assets;
    issues: Map<string, readonly CollectionEntryIssue[]>;
  }>();
  useEffect(() => {
    let cancelled = false;
    if (collection?.status !== "ready" || projectId === undefined) {
      return;
    }
    const repository = createBuilderHttpAssetContentRepository({ projectId });
    void checkCollectionEntries({
      collection,
      assets: Array.from(assets.values()),
      cache,
      cancelled: () => cancelled,
      readFrontmatter: async (asset) => {
        if (asset.size === 0) {
          return {};
        }
        const content = await repository.readContent({
          assetId: asset.id,
          range: {
            offset: 0,
            length: Math.min(
              asset.size,
              // Include delimiters, CRLF and an optional UTF-8 BOM.
              contentEngineLimits.frontmatterBytes + 16
            ),
          },
        });
        const { properties } = await extractMarkdownFrontmatter(content.data);
        if (content.asset.name !== asset.name) {
          throw new Error("Entry changed during validation");
        }
        return properties;
      },
    }).then((issues) => {
      if (!cancelled) {
        setResult({ collection, assets, issues });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [assets, cache, collection, projectId, refresh]);
  return {
    issues:
      result !== undefined &&
      result.collection === collection &&
      result.assets === assets
        ? result.issues
        : undefined,
    retry: () => setRefresh((value) => value + 1),
  };
};
