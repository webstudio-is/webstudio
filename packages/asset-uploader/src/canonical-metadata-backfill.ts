import {
  createCanonicalAssetFileEntry,
  fullCanonicalAssetMetadataRequirements,
  getCanonicalAssetMetadataRequirements,
  prepareCanonicalContentMetadata,
  readBytePrefix,
  mapBounded,
  serializeJsonDeterministically,
  satisfiesCanonicalAssetMetadataRequirements,
  normalizeAssetFileDocument,
  type CanonicalAssetFileEntry,
  type CanonicalAssetMetadataRequirements,
} from "@webstudio-is/content-engine/compiler";
import type { AssetFileDocument } from "@webstudio-is/content-engine";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  getFileNameParts,
  getMimeTypeByFilename,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import type { Client } from "@webstudio-is/postgrest/index.server";
import type { AssetObjectStore } from "./client";
import { loadAssetFoldersByProjectWithClient } from "./folder-persistence";
import { assertPostgrestSuccess } from "./patch-utils";
import { createAssetContentRevision } from "./content-revision";
import {
  deleteCanonicalAssetFileEntryIfMatches,
  deleteInvalidCanonicalAssetFileEntryIfMatches,
  deleteStaleCanonicalAssetFileEntries,
  loadCanonicalAssetFileEntries,
  loadCanonicalAssetFileEntriesForRecovery,
  replaceCanonicalAssetFileEntry,
} from "./canonical-metadata-persistence";

type CanonicalAssetClient = Pick<AssetObjectStore, "readFile"> &
  Partial<Omit<AssetObjectStore, "readFile">>;

export type CanonicalAssetSynchronizationIssue = {
  assetId: string;
  storageName: string;
  revision: string;
  message: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown asset indexing failure";

type UploadedAssetRow = {
  id: string;
  projectId: string;
  filename: string | null;
  description: string | null;
  folderId: string | null;
  file: {
    name: string;
    size: number;
    createdAt?: string;
    updatedAt: string;
    contentHash?: string | null;
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
      "id, projectId, filename, description, folderId, file:File!inner(name, size, createdAt, updatedAt, contentHash, status)"
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
  ...(asset.file.contentHash === null || asset.file.contentHash === undefined
    ? {}
    : { contentHash: asset.file.contentHash }),
  ...(asset.filename === null ? {} : { filename: asset.filename }),
  ...(asset.description === null ? {} : { description: asset.description }),
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
      ...(asset.description === null ? {} : { description: asset.description }),
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

const createCanonicalBaseEntry = ({
  projectId,
  asset,
  hierarchy,
  revision = createAssetContentRevision({
    storageName: asset.file.name,
    updatedAt: asset.file.updatedAt,
    size: asset.file.size,
    contentHash: asset.file.contentHash,
  }),
}: {
  projectId: string;
  asset: UploadedAssetRow;
  hierarchy: AssetFolderHierarchy;
  revision?: string;
}) => {
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
  return assets.map((asset) =>
    createCanonicalBaseEntry({
      projectId,
      asset,
      hierarchy,
    })
  );
};

const hasMatchingCanonicalDocument = (
  document: AssetFileDocument,
  expected: AssetFileDocument
) => {
  return (
    serializeJsonDeterministically(document) ===
    serializeJsonDeterministically(expected)
  );
};

export const areCanonicalAssetFileEntriesCurrent = ({
  baseEntries,
  currentEntries,
  requirements,
}: {
  baseEntries: readonly CanonicalAssetFileEntry[];
  currentEntries: readonly CanonicalAssetFileEntry[];
  requirements: CanonicalAssetMetadataRequirements;
}) => {
  if (baseEntries.length !== currentEntries.length) {
    return false;
  }
  const currentByAssetId = new Map(
    currentEntries.map((entry) => [entry.assetId, entry])
  );
  return baseEntries.every((base) => {
    const current = currentByAssetId.get(base.assetId);
    if (
      current === undefined ||
      current.revision !== base.revision ||
      satisfiesCanonicalAssetMetadataRequirements({
        cached: getCanonicalAssetMetadataRequirements(current),
        required: requirements,
      }) === false
    ) {
      return false;
    }
    const {
      properties: _properties,
      excerpt: _excerpt,
      metadataError: _metadataError,
      ...baseDocument
    } = base.document;
    const expected = {
      ...baseDocument,
      properties: current.document.properties,
      ...(base.document.extension === "md" &&
      current.document.excerpt !== undefined
        ? { excerpt: current.document.excerpt }
        : {}),
      ...(current.document.metadataError === undefined
        ? {}
        : { metadataError: current.document.metadataError }),
    };
    return hasMatchingCanonicalDocument(current.document, expected);
  });
};

const indexCanonicalAsset = async ({
  asset,
  client,
  assetClient,
  requirements,
  base,
  current,
}: {
  asset: UploadedAssetRow;
  client: Client;
  assetClient: CanonicalAssetClient;
  requirements: CanonicalAssetMetadataRequirements;
  base: CanonicalAssetFileEntry;
  current?: CanonicalAssetFileEntry;
}) => {
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
            .then((stored) => readBytePrefix(stored.data, maximumBytes)),
  });
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
    contentHash: asset.file.contentHash,
  });
  const entry = entries[0];
  if (entry !== undefined && entry.revision !== currentRevision) {
    await deleteCanonicalAssetFileEntryIfMatches({ client, entry });
  }
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
  const { entries, inconsistentRows } = recoveryState;
  const inconsistentAssetIds = inconsistentRows.map(({ assetId }) => assetId);
  const inconsistentRowByAssetId = new Map(
    inconsistentRows.map((row) => [row.assetId, row])
  );
  const hierarchy = createAssetFolderHierarchy(
    new Map(folders.map((folder) => [folder.id, folder]))
  );
  const uploadedAssetIds = new Set(assets.map((asset) => asset.id));
  const entriesByAssetId = new Map(
    entries.map((entry) => [entry.assetId, entry])
  );

  let indexed = 0;
  let metadataUpdated = 0;
  let unchanged = 0;
  const issues: CanonicalAssetSynchronizationIssue[] = [];
  await mapBounded(assets, concurrency, async (asset) => {
    const revision = createAssetContentRevision({
      storageName: asset.file.name,
      updatedAt: asset.file.updatedAt,
      size: asset.file.size,
      contentHash: asset.file.contentHash,
    });
    const stored = entriesByAssetId.get(asset.id);
    const current = stored?.revision === revision ? stored : undefined;
    const requirementsSatisfied =
      current !== undefined &&
      satisfiesCanonicalAssetMetadataRequirements({
        cached: getCanonicalAssetMetadataRequirements(current),
        required: requirements,
      });
    if (current === undefined || requirementsSatisfied === false) {
      try {
        await indexCanonicalAsset({
          asset,
          client,
          assetClient,
          requirements,
          base: createCanonicalBaseEntry({
            projectId,
            asset,
            hierarchy,
            revision,
          }),
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
          const inconsistentRow = inconsistentRowByAssetId.get(asset.id);
          if (inconsistentRow === undefined) {
            await deleteObsoleteCanonicalAssetMetadata({
              client,
              projectId,
              assetId: asset.id,
            });
          } else {
            await deleteInvalidCanonicalAssetFileEntryIfMatches({
              client,
              row: inconsistentRow,
            });
          }
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
      excerpt:
        current.document.extension === "md"
          ? current.document.excerpt
          : undefined,
      metadataError: current.document.metadataError,
    });
    if (hasMatchingCanonicalDocument(current.document, expected)) {
      unchanged += 1;
      return;
    }
    await replaceCanonicalAssetFileEntry({
      client,
      entry: createCanonicalAssetFileEntry({
        projectId,
        document: expected,
        metadataRequirements: getCanonicalAssetMetadataRequirements(current),
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
