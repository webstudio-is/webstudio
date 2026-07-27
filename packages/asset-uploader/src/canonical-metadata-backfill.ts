import {
  createCanonicalAssetFileEntry,
  fullCanonicalAssetMetadataRequirements,
  prepareCanonicalContentMetadata,
  satisfiesCanonicalAssetMetadataRequirements,
  normalizeAssetFileDocument,
  type CanonicalAssetFileEntry,
  type CanonicalAssetMetadataRequirements,
} from "@webstudio-is/content-engine/compiler";
import {
  assetResourceLimits,
  createAssetFolderHierarchy,
  formatAssetName,
  getFileNameParts,
  getMimeTypeByFilename,
  type AssetFileDocument,
} from "@webstudio-is/sdk";
import type { Client } from "@webstudio-is/postgrest/index.server";
import type { AssetObjectStore } from "./client";
import { loadAssetFoldersByProjectWithClient } from "./folder-persistence";
import { assertPostgrestSuccess } from "./patch-utils";
import {
  deleteCanonicalAssetFileEntryIfMatches,
  deleteStaleCanonicalAssetFileEntries,
  loadCanonicalAssetFileEntries,
  loadCanonicalAssetFileEntriesForRecovery,
  replaceCanonicalAssetFileEntry,
} from "./canonical-metadata-persistence";
import { runBounded } from "./async-utils";

type CanonicalAssetClient = Pick<AssetObjectStore, "readFile"> &
  Partial<Omit<AssetObjectStore, "readFile">>;

const getEntryRequirements = (entry: CanonicalAssetFileEntry) =>
  entry.metadataRequirements ?? fullCanonicalAssetMetadataRequirements;

export type CanonicalAssetSynchronizationIssue = {
  assetId: string;
  storageName: string;
  revision: string;
  message: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown asset indexing failure";

export const createAssetContentRevision = ({
  storageName,
  updatedAt,
  size,
}: {
  storageName: string;
  updatedAt: string;
  size: number;
}) => `file:${encodeURIComponent(storageName)}:${updatedAt}:${size}`;

const readPrefix = async (
  data: AsyncIterable<Uint8Array>,
  maximumBytes: number
) => {
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of data) {
    const remaining = maximumBytes - length;
    if (remaining <= 0) {
      break;
    }
    const retained = chunk.subarray(0, remaining);
    chunks.push(retained);
    length += retained.byteLength;
    if (length === maximumBytes) {
      break;
    }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

type UploadedAssetRow = {
  id: string;
  projectId: string;
  filename: string | null;
  folderId: string | null;
  file: {
    name: string;
    size: number;
    createdAt?: string;
    updatedAt: string;
  };
};

const loadUploadedAssets = async (
  projectId: string,
  client: Client,
  assetIds?: string[]
) => {
  let query = client
    .from("Asset")
    .select(
      "id, projectId, filename, folderId, file:File!inner(name, size, createdAt, updatedAt, status)"
    )
    .eq("projectId", projectId)
    .eq("file.status", "UPLOADED");
  if (assetIds !== undefined) {
    if (assetIds.length === 0) {
      return [];
    }
    query = query.in("id", assetIds);
  }
  const result = await query.order("id");
  assertPostgrestSuccess(result);
  return (result.data ?? []) as UploadedAssetRow[];
};

type AssetFolderHierarchy = ReturnType<typeof createAssetFolderHierarchy>;

const getCanonicalMetadataSource = (asset: UploadedAssetRow) => ({
  storageName: asset.file.name,
  fileUpdatedAt: asset.file.updatedAt,
  fileSize: asset.file.size,
  ...(asset.filename === null ? {} : { filename: asset.filename }),
  ...(asset.folderId === null ? {} : { folderId: asset.folderId }),
});

const createCanonicalDocument = ({
  asset,
  hierarchy,
  revision,
  properties,
  excerpt,
  metadataError,
}: {
  asset: UploadedAssetRow;
  hierarchy: AssetFolderHierarchy;
  revision: string;
  properties: Record<string, unknown>;
  excerpt?: string;
  metadataError?: AssetFileDocument["metadataError"];
}) => {
  const name = formatAssetName({
    name: asset.file.name,
    filename: asset.filename,
  });
  const extension = getFileNameParts(asset.file.name).extension.toLowerCase();
  const folderId = hierarchy.resolveFolderId(asset.folderId ?? undefined);
  const folderNames = hierarchy.getPath(folderId).map((folder) => folder.name);
  return normalizeAssetFileDocument({
    asset: {
      id: asset.id,
      name,
      ...(extension === "" ? {} : { extension }),
      ...(folderId === undefined ? {} : { folderId, folderNames }),
      mimeType: getMimeTypeByFilename(asset.file.name),
      size: asset.file.size,
      createdAt: asset.file.createdAt,
      revision,
      contentRef: asset.file.name,
    },
    properties,
    ...(excerpt === undefined || excerpt.length === 0 ? {} : { excerpt }),
    ...(metadataError === undefined ? {} : { metadataError }),
  });
};

/** Builds the base index tier entirely from logical asset records. */
export const loadCanonicalAssetBaseEntries = async ({
  projectId,
  client,
}: {
  projectId: string;
  client: Client;
}) => {
  const [assets, folders] = await Promise.all([
    loadUploadedAssets(projectId, client),
    loadAssetFoldersByProjectWithClient(projectId, client),
  ]);
  const hierarchy = createAssetFolderHierarchy(
    new Map(folders.map((folder) => [folder.id, folder]))
  );
  return assets.map((asset) => {
    const revision = createAssetContentRevision({
      storageName: asset.file.name,
      updatedAt: asset.file.updatedAt,
      size: asset.file.size,
    });
    return createCanonicalAssetFileEntry({
      projectId,
      metadataRequirements: {
        structuredProperties: false,
        excerpt: false,
      },
      document: createCanonicalDocument({
        asset,
        hierarchy,
        revision,
        properties: {},
      }),
    });
  });
};

const hasMatchingStandardMetadata = (
  document: AssetFileDocument,
  expected: AssetFileDocument
) =>
  document.name === expected.name &&
  document.path === expected.path &&
  document.key === expected.key &&
  document.folderId === expected.folderId &&
  document.extension === expected.extension &&
  document.mimeType === expected.mimeType &&
  document.size === expected.size &&
  document.createdAt === expected.createdAt &&
  document.contentRef === expected.contentRef;

const indexCanonicalAsset = async ({
  projectId,
  asset,
  hierarchy,
  client,
  assetClient,
  requirements,
  current,
}: {
  projectId: string;
  asset: UploadedAssetRow;
  hierarchy: AssetFolderHierarchy;
  client: Client;
  assetClient: CanonicalAssetClient;
  requirements: CanonicalAssetMetadataRequirements;
  current?: CanonicalAssetFileEntry;
}) => {
  const revision = createAssetContentRevision({
    storageName: asset.file.name,
    updatedAt: asset.file.updatedAt,
    size: asset.file.size,
  });
  const base = createCanonicalAssetFileEntry({
    projectId,
    metadataRequirements: { structuredProperties: false, excerpt: false },
    document: createCanonicalDocument({
      asset,
      hierarchy,
      revision,
      properties: {},
    }),
  });
  await prepareCanonicalContentMetadata({
    base,
    requirements,
    cache: {
      get: async () => current,
      set: async ({ entry }) => {
        await replaceCanonicalAssetFileEntry({
          client,
          entry,
          source: getCanonicalMetadataSource(asset),
        });
      },
    },
    readBytes: async (maximumBytes) =>
      maximumBytes === 0
        ? new Uint8Array()
        : await assetClient
            .readFile(asset.file.name, {
              offset: 0,
              length: maximumBytes,
            })
            .then((stored) => readPrefix(stored.data, maximumBytes)),
  });
  return revision;
};

const deleteObsoleteCanonicalAssetMetadata = async ({
  projectId,
  assetId,
  client,
}: {
  projectId: string;
  assetId: string;
  client: Client;
}) => {
  const [assets, entries] = await Promise.all([
    loadUploadedAssets(projectId, client, [assetId]),
    loadCanonicalAssetFileEntries({ client, projectId, assetIds: [assetId] }),
  ]);
  const asset = assets[0];
  if (asset === undefined) {
    await deleteStaleCanonicalAssetFileEntries({
      client,
      projectId,
      assetIds: [assetId],
    });
    return;
  }
  const currentRevision = createAssetContentRevision({
    storageName: asset.file.name,
    updatedAt: asset.file.updatedAt,
    size: asset.file.size,
  });
  for (const entry of entries) {
    if (entry.revision !== currentRevision) {
      await deleteCanonicalAssetFileEntryIfMatches({ client, entry });
    }
  }
};

export const synchronizeCanonicalAsset = async ({
  projectId,
  assetId,
  client,
  assetClient,
}: {
  projectId: string;
  assetId: string;
  client: Client;
  assetClient: CanonicalAssetClient;
}) => {
  const assets = await loadUploadedAssets(projectId, client, [assetId]);
  const asset = assets[0];
  if (asset === undefined) {
    await deleteStaleCanonicalAssetFileEntries({
      client,
      projectId,
      assetIds: [assetId],
    });
    return { status: "deleted" as const };
  }

  let revision: string;
  try {
    const folders = await loadAssetFoldersByProjectWithClient(
      projectId,
      client
    );
    const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
    const hierarchy = createAssetFolderHierarchy(folderMap);
    revision = await indexCanonicalAsset({
      projectId,
      asset,
      hierarchy,
      client,
      assetClient,
      requirements: fullCanonicalAssetMetadataRequirements,
    });
  } catch (error) {
    try {
      await deleteObsoleteCanonicalAssetMetadata({
        client,
        projectId,
        assetId,
      });
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `${getErrorMessage(error)}; stale metadata cleanup failed: ${getErrorMessage(cleanupError)}`
      );
    }
    throw error;
  }
  return { status: "indexed" as const, revision };
};

export const synchronizeCanonicalAssets = async ({
  projectId,
  client,
  assetClient,
  concurrency = assetResourceLimits.concurrentContentReads,
  requirements = fullCanonicalAssetMetadataRequirements,
  assetIds,
}: {
  projectId: string;
  client: Client;
  assetClient: CanonicalAssetClient;
  concurrency?: number;
  requirements?: CanonicalAssetMetadataRequirements;
  assetIds?: string[];
}) => {
  if (Number.isInteger(concurrency) === false || concurrency <= 0) {
    throw new Error(
      "Canonical metadata concurrency must be a positive integer"
    );
  }
  if (concurrency > assetResourceLimits.concurrentContentReads) {
    throw new Error("Canonical metadata concurrency exceeds the shared limit");
  }

  const [assets, folders, recoveryState] = await Promise.all([
    loadUploadedAssets(projectId, client, assetIds),
    loadAssetFoldersByProjectWithClient(projectId, client),
    loadCanonicalAssetFileEntriesForRecovery({
      client,
      projectId,
      assetIds,
    }),
  ]);
  const { entries, inconsistentAssetIds } = recoveryState;
  const inconsistentAssetIdSet = new Set(inconsistentAssetIds);
  const hierarchy = createAssetFolderHierarchy(
    new Map(folders.map((folder) => [folder.id, folder]))
  );
  const uploadedAssetIds = new Set(assets.map((asset) => asset.id));
  const entriesByAssetId = new Map<string, typeof entries>();
  for (const entry of entries) {
    const assetEntries = entriesByAssetId.get(entry.assetId) ?? [];
    assetEntries.push(entry);
    entriesByAssetId.set(entry.assetId, assetEntries);
  }

  let indexed = 0;
  let metadataUpdated = 0;
  let unchanged = 0;
  const issues: CanonicalAssetSynchronizationIssue[] = [];
  await runBounded(assets, concurrency, async (asset) => {
    const revision = createAssetContentRevision({
      storageName: asset.file.name,
      updatedAt: asset.file.updatedAt,
      size: asset.file.size,
    });
    const assetEntries = entriesByAssetId.get(asset.id) ?? [];
    const current = assetEntries.find((entry) => entry.revision === revision);
    const requirementsSatisfied =
      current !== undefined &&
      satisfiesCanonicalAssetMetadataRequirements({
        cached: getEntryRequirements(current),
        required: requirements,
      });
    if (
      current === undefined ||
      requirementsSatisfied === false ||
      inconsistentAssetIdSet.has(asset.id)
    ) {
      try {
        await indexCanonicalAsset({
          projectId,
          asset,
          hierarchy,
          client,
          assetClient,
          requirements,
          current,
        });
        indexed += 1;
      } catch (error) {
        const issue: CanonicalAssetSynchronizationIssue = {
          assetId: asset.id,
          storageName: asset.file.name,
          revision,
          message: getErrorMessage(error),
        };
        try {
          // Never leave a previous revision visible as if it represented the
          // current object after re-indexing failed.
          await deleteObsoleteCanonicalAssetMetadata({
            client,
            projectId,
            assetId: asset.id,
          });
        } catch (cleanupError) {
          issue.message += `; stale metadata cleanup failed: ${getErrorMessage(cleanupError)}`;
        }
        issues.push(issue);
      }
      return;
    }

    const expected = createCanonicalDocument({
      asset,
      hierarchy,
      revision,
      properties: current.document.properties,
      excerpt: current.document.excerpt,
      metadataError: current.document.metadataError,
    });
    if (
      assetEntries.length === 1 &&
      hasMatchingStandardMetadata(current.document, expected)
    ) {
      unchanged += 1;
      return;
    }
    await replaceCanonicalAssetFileEntry({
      client,
      entry: createCanonicalAssetFileEntry({
        projectId,
        document: expected,
        metadataRequirements: getEntryRequirements(current),
      }),
      source: getCanonicalMetadataSource(asset),
    });
    metadataUpdated += 1;
  });

  const staleAssetIds = Array.from(
    new Set(
      [
        ...entries.map((entry) => entry.assetId),
        ...inconsistentAssetIds,
      ].filter((assetId) => uploadedAssetIds.has(assetId) === false)
    )
  );
  const removed = await deleteStaleCanonicalAssetFileEntries({
    client,
    projectId,
    assetIds: staleAssetIds,
  });

  return {
    scanned: assets.length,
    indexed,
    metadataUpdated,
    unchanged,
    removed,
    skipped: issues.length,
    inconsistent: inconsistentAssetIds.length,
    issues: issues.sort((left, right) =>
      left.assetId.localeCompare(right.assetId)
    ),
  };
};

export const synchronizeCanonicalAssetStandardMetadata = async ({
  projectId,
  assetIds,
  client,
}: {
  projectId: string;
  assetIds: string[];
  client: Client;
}) => {
  if (assetIds.length === 0) {
    return 0;
  }
  const entries = await loadCanonicalAssetFileEntries({
    client,
    projectId,
    assetIds,
  });
  if (entries.length === 0) {
    return 0;
  }
  const [assets, folders] = await Promise.all([
    loadUploadedAssets(projectId, client, assetIds),
    loadAssetFoldersByProjectWithClient(projectId, client),
  ]);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const entriesByAssetId = new Map<string, typeof entries>();
  for (const entry of entries) {
    const assetEntries = entriesByAssetId.get(entry.assetId) ?? [];
    assetEntries.push(entry);
    entriesByAssetId.set(entry.assetId, assetEntries);
  }
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
  const hierarchy = createAssetFolderHierarchy(folderMap);
  let updated = 0;
  for (const asset of assetsById.values()) {
    const revision = createAssetContentRevision({
      storageName: asset.file.name,
      updatedAt: asset.file.updatedAt,
      size: asset.file.size,
    });
    const assetEntries = entriesByAssetId.get(asset.id) ?? [];
    const entry = assetEntries.find(
      (candidate) => candidate.revision === revision
    );
    if (entry === undefined) {
      continue;
    }
    const document = createCanonicalDocument({
      asset,
      hierarchy,
      revision,
      properties: entry.document.properties,
      excerpt: entry.document.excerpt,
      metadataError: entry.document.metadataError,
    });
    try {
      await replaceCanonicalAssetFileEntry({
        client,
        entry: createCanonicalAssetFileEntry({
          projectId,
          document,
          metadataRequirements: getEntryRequirements(entry),
        }),
        source: getCanonicalMetadataSource(asset),
      });
    } catch (error) {
      try {
        await deleteCanonicalAssetFileEntryIfMatches({ client, entry });
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          `${getErrorMessage(error)}; stale metadata cleanup failed: ${getErrorMessage(cleanupError)}`
        );
      }
      throw error;
    }
    updated += 1;
  }
  return updated;
};

export const synchronizeAllCanonicalAssetStandardMetadata = async ({
  projectId,
  client,
}: {
  projectId: string;
  client: Client;
}) => {
  const entries = await loadCanonicalAssetFileEntries({ client, projectId });
  return await synchronizeCanonicalAssetStandardMetadata({
    projectId,
    client,
    assetIds: [...new Set(entries.map(({ assetId }) => assetId))],
  });
};
