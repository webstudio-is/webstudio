import {
  createCanonicalAssetFileEntry,
  fullCanonicalAssetMetadataRequirements,
  getCanonicalAssetMetadataRequirements,
  getCanonicalAssetMetadataRequirementsForTier,
  getCanonicalAssetMetadataTier,
  type CanonicalAssetFileEntry,
} from "@webstudio-is/content-engine/compiler";
import type { Client, Database } from "@webstudio-is/postgrest/index.server";
import { assertPostgrestSuccess } from "./patch-utils";

type MetadataRow = Database["public"]["Tables"]["AssetFileMetadata"]["Row"];

const requirementsKey = "$webstudioMetadataRequirements";

// Keep cache completeness in the stored document envelope so expanding
// requirements can reuse a matching revision. The marker is stripped before
// schema validation and never reaches query indexes or results.
const serializeMetadataDocument = (entry: CanonicalAssetFileEntry) => ({
  ...entry.document,
  [requirementsKey]: getCanonicalAssetMetadataTier(
    getCanonicalAssetMetadataRequirements(entry)
  ),
});

export type CanonicalAssetMetadataSource = {
  storageName: string;
  fileUpdatedAt: string;
  fileSize: number;
  filename?: string;
  folderId?: string;
};

const parseMetadataRow = (row: MetadataRow): CanonicalAssetFileEntry => {
  if (
    typeof row.document !== "object" ||
    row.document === null ||
    Array.isArray(row.document)
  ) {
    throw new Error("Canonical asset metadata document is invalid");
  }
  const { [requirementsKey]: requirements, ...document } = row.document;
  const entry = createCanonicalAssetFileEntry({
    projectId: row.projectId,
    document,
    metadataRequirements:
      requirements === undefined
        ? fullCanonicalAssetMetadataRequirements
        : getCanonicalAssetMetadataRequirementsForTier(requirements),
  });
  if (entry.assetId !== row.assetId || entry.revision !== row.revision) {
    throw new Error("Canonical asset metadata identity is inconsistent");
  }
  return entry;
};

export const replaceCanonicalAssetFileEntry = async ({
  client,
  entry,
  source,
}: {
  client: Client;
  entry: CanonicalAssetFileEntry;
  source: CanonicalAssetMetadataSource;
}): Promise<CanonicalAssetFileEntry> => {
  if (
    entry.document._id !== entry.assetId ||
    entry.document.revision !== entry.revision
  ) {
    throw new Error("Canonical asset metadata identity is inconsistent");
  }
  const result = await client.rpc("replace_asset_file_metadata", {
    p_project_id: entry.projectId,
    p_asset_id: entry.assetId,
    p_revision: entry.revision,
    p_document: serializeMetadataDocument(entry),
    p_source: {
      storageName: source.storageName,
      fileUpdatedAt: source.fileUpdatedAt,
      fileSize: source.fileSize,
      filename: source.filename ?? null,
      folderId: source.folderId ?? null,
    },
  });
  assertPostgrestSuccess(result);
  if (result.data !== true) {
    throw new Error("Canonical asset metadata source changed during update");
  }
  return entry;
};

export const deleteStaleCanonicalAssetFileEntries = async ({
  client,
  projectId,
  assetIds,
}: {
  client: Client;
  projectId: string;
  assetIds: string[];
}) => {
  if (assetIds.length === 0) {
    return 0;
  }
  const result = await client.rpc("delete_stale_asset_file_metadata", {
    p_project_id: projectId,
    p_asset_ids: assetIds,
  });
  assertPostgrestSuccess(result);
  return result.data ?? 0;
};

export const deleteCanonicalAssetFileEntryIfMatches = async ({
  client,
  entry,
}: {
  client: Client;
  entry: CanonicalAssetFileEntry;
}) => {
  const result = await client.rpc("delete_asset_file_metadata_if_matches", {
    p_project_id: entry.projectId,
    p_asset_id: entry.assetId,
    p_revision: entry.revision,
    p_document: serializeMetadataDocument(entry),
  });
  assertPostgrestSuccess(result);
  return result.data ?? 0;
};

export const loadCanonicalAssetFileEntry = async ({
  client,
  projectId,
  assetId,
  revision,
}: {
  client: Client;
  projectId: string;
  assetId: string;
  revision: string;
}): Promise<CanonicalAssetFileEntry | undefined> => {
  const result = await client
    .from("AssetFileMetadata")
    .select()
    .eq("projectId", projectId)
    .eq("assetId", assetId)
    .eq("revision", revision)
    .maybeSingle();
  assertPostgrestSuccess(result);
  return result.data === null ? undefined : parseMetadataRow(result.data);
};

const loadCanonicalAssetFileMetadataRows = async ({
  client,
  projectId,
  assetIds,
}: {
  client: Client;
  projectId: string;
  assetIds?: string[];
}): Promise<MetadataRow[]> => {
  let query = client
    .from("AssetFileMetadata")
    .select()
    .eq("projectId", projectId);
  if (assetIds !== undefined) {
    if (assetIds.length === 0) {
      return [];
    }
    query = query.in("assetId", assetIds);
  }
  const result = await query.order("assetId");
  assertPostgrestSuccess(result);
  return result.data ?? [];
};

export const loadCanonicalAssetFileEntries = async ({
  client,
  projectId,
  assetIds,
}: {
  client: Client;
  projectId: string;
  assetIds?: string[];
}): Promise<CanonicalAssetFileEntry[]> => {
  const rows = await loadCanonicalAssetFileMetadataRows({
    client,
    projectId,
    assetIds,
  });
  return rows.map(parseMetadataRow);
};

export const loadCanonicalAssetFileEntriesForRecovery = async ({
  client,
  projectId,
  assetIds,
}: {
  client: Client;
  projectId: string;
  assetIds?: string[];
}) => {
  const rows = await loadCanonicalAssetFileMetadataRows({
    client,
    projectId,
    assetIds,
  });
  const entries: CanonicalAssetFileEntry[] = [];
  const inconsistentAssetIds = new Set<string>();
  for (const row of rows) {
    try {
      entries.push(parseMetadataRow(row));
    } catch {
      inconsistentAssetIds.add(row.assetId);
    }
  }
  return {
    entries,
    inconsistentAssetIds: Array.from(inconsistentAssetIds).sort(),
  };
};
