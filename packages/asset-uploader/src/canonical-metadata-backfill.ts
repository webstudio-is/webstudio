import {
  createCanonicalAssetFileEntry,
  extractMarkdownBodyAndExcerpt,
  extractMarkdownFrontmatter,
  MarkdownMetadataError,
  normalizeAssetFileDocument,
} from "@webstudio-is/asset-resource";
import {
  assetResourceLimits,
  createAssetFolderHierarchy,
  formatAssetName,
  getFileNameParts,
  getMimeTypeByFilename,
  type AssetFileDocument,
} from "@webstudio-is/sdk";
import type { Client } from "@webstudio-is/postgrest/index.server";
import type { AssetClient } from "./client";
import { loadAssetFoldersByProjectWithClient } from "./folder-persistence";
import { assertPostgrestSuccess } from "./patch-utils";
import {
  deleteStaleCanonicalAssetFileEntries,
  loadCanonicalAssetFileEntries,
  loadCanonicalAssetFileEntriesForRecovery,
  replaceCanonicalAssetFileEntry,
} from "./canonical-metadata-persistence";
import { runBounded } from "./async-utils";

const markdownExtension = /\.md$/i;
type CanonicalAssetClient = Pick<AssetClient, "readFile"> &
  Partial<Omit<AssetClient, "readFile">>;

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
      "id, projectId, filename, folderId, file:File!inner(name, size, updatedAt, status)"
    )
    .eq("projectId", projectId)
    .eq("file.status", "UPLOADED");
  if (assetIds !== undefined && assetIds.length > 0) {
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
      revision,
      contentRef: asset.file.name,
    },
    properties,
    ...(excerpt === undefined || excerpt.length === 0 ? {} : { excerpt }),
    ...(metadataError === undefined ? {} : { metadataError }),
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
  document.contentRef === expected.contentRef;

const indexCanonicalAsset = async ({
  projectId,
  asset,
  hierarchy,
  client,
  assetClient,
}: {
  projectId: string;
  asset: UploadedAssetRow;
  hierarchy: AssetFolderHierarchy;
  client: Client;
  assetClient: CanonicalAssetClient;
}) => {
  let properties: Record<string, unknown> = {};
  let excerpt: string | undefined;
  let metadataError: AssetFileDocument["metadataError"];
  if (markdownExtension.test(asset.file.name)) {
    const prefixLength = Math.min(
      asset.file.size,
      assetResourceLimits.hydratedFileBytes
    );
    const bytes =
      prefixLength === 0
        ? new Uint8Array()
        : await assetClient
            .readFile(asset.file.name, { offset: 0, length: prefixLength })
            .then((stored) => readPrefix(stored.data, prefixLength));
    try {
      properties = (await extractMarkdownFrontmatter(bytes)).properties;
    } catch (error) {
      if (error instanceof MarkdownMetadataError === false) {
        throw error;
      }
      metadataError = { code: error.code, message: error.message };
    }
    try {
      excerpt = (await extractMarkdownBodyAndExcerpt(bytes)).excerpt;
    } catch (error) {
      if (error instanceof MarkdownMetadataError === false) {
        throw error;
      }
      metadataError ??= { code: error.code, message: error.message };
    }
  }
  const revision = createAssetContentRevision({
    storageName: asset.file.name,
    updatedAt: asset.file.updatedAt,
    size: asset.file.size,
  });
  const document = createCanonicalDocument({
    asset,
    hierarchy,
    revision,
    properties,
    excerpt,
    metadataError,
  });
  await replaceCanonicalAssetFileEntry({
    client,
    entry: createCanonicalAssetFileEntry({ projectId, document }),
    source: getCanonicalMetadataSource(asset),
  });
  return revision;
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

  const folders = await loadAssetFoldersByProjectWithClient(projectId, client);
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
  const hierarchy = createAssetFolderHierarchy(folderMap);
  const revision = await indexCanonicalAsset({
    projectId,
    asset,
    hierarchy,
    client,
    assetClient,
  });
  return { status: "indexed" as const, revision };
};

export const synchronizeCanonicalAssets = async ({
  projectId,
  client,
  assetClient,
  concurrency = assetResourceLimits.concurrentContentReads,
}: {
  projectId: string;
  client: Client;
  assetClient: CanonicalAssetClient;
  concurrency?: number;
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
    loadUploadedAssets(projectId, client),
    loadAssetFoldersByProjectWithClient(projectId, client),
    loadCanonicalAssetFileEntriesForRecovery({ client, projectId }),
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
  await runBounded(assets, concurrency, async (asset) => {
    const revision = createAssetContentRevision({
      storageName: asset.file.name,
      updatedAt: asset.file.updatedAt,
      size: asset.file.size,
    });
    const assetEntries = entriesByAssetId.get(asset.id) ?? [];
    const current = assetEntries.find((entry) => entry.revision === revision);
    if (current === undefined || inconsistentAssetIdSet.has(asset.id)) {
      await indexCanonicalAsset({
        projectId,
        asset,
        hierarchy,
        client,
        assetClient,
      });
      indexed += 1;
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
    skipped: 0,
    inconsistent: inconsistentAssetIds.length,
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
    const entry =
      assetEntries.find((candidate) => candidate.revision === revision) ??
      (assetEntries.length === 1 ? assetEntries[0] : undefined);
    if (entry === undefined) {
      continue;
    }
    const document = createCanonicalDocument({
      asset,
      hierarchy,
      revision,
      properties: entry.document.properties,
      excerpt: entry.document.excerpt,
    });
    await replaceCanonicalAssetFileEntry({
      client,
      entry: createCanonicalAssetFileEntry({ projectId, document }),
      source: getCanonicalMetadataSource(asset),
    });
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
