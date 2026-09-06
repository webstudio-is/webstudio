import { asset as assetSchema, type Asset, assets } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import type { Client, Database } from "@webstudio-is/postgrest/index.server";
import { mapBounded } from "@webstudio-is/content-engine/compiler";
import { formatAsset } from "./utils/format-asset";
import {
  applyValidatedMapPatches,
  assertPostgrestSuccess,
  diffMaps,
  type Patch,
} from "./patch-utils";
import {
  AssetRevisionConflictError,
  swapAssetFileWithClient,
} from "./revision";
import type { AssetMetadataUpdate } from "./asset-mutation-types";
import { AssetRepositoryNotFoundError } from "./asset-repository-errors";

const serializeAssetMeta = (meta: Asset["meta"]) => JSON.stringify(meta);

type FileRow = Database["public"]["Tables"]["File"]["Row"];

const getCanonicalAssetsForValidation = async ({
  current,
  next,
  client,
}: {
  current: ReadonlyMap<Asset["id"], Asset>;
  next: ReadonlyMap<Asset["id"], Asset>;
  client: Client;
}) => {
  const canonical = new Map<Asset["id"], Asset>();
  const filesByName = new Map<string, FileRow>();
  const assetsWithChangedFiles: Asset[] = [];
  for (const [assetId, asset] of next) {
    const previous = current.get(assetId);
    if (previous?.name === asset.name) {
      canonical.set(
        assetId,
        assetSchema.parse({
          ...previous,
          filename: asset.filename,
          description: asset.description,
          folderId: asset.folderId,
          meta: asset.meta,
        })
      );
      continue;
    }
    assetsWithChangedFiles.push(asset);
  }
  if (assetsWithChangedFiles.length === 0) {
    return { assets: canonical, filesByName };
  }

  const files = await loadUploadedFilesByNames({
    names: assetsWithChangedFiles.map((asset) => asset.name),
    client,
  });
  for (const file of files) {
    filesByName.set(file.name, file);
  }
  for (const asset of assetsWithChangedFiles) {
    const file = filesByName.get(asset.name);
    if (file === undefined) {
      throw new AssetRepositoryNotFoundError(
        `Asset file not found for ${asset.id}`
      );
    }
    canonical.set(
      asset.id,
      assetSchema.parse({
        ...formatAsset({
          assetId: asset.id,
          projectId: asset.projectId,
          filename: asset.filename ?? null,
          description: asset.description ?? null,
          folderId: asset.folderId,
          file,
        }),
        meta: asset.meta,
      })
    );
  }
  return { assets: canonical, filesByName };
};

// Supabase documents that REST requests most often hit Cloudflare 520 errors
// at 16+ KiB across the URL and headers, especially with long `in` filters:
// https://supabase.com/docs/guides/troubleshooting/fixing-520-errors-in-the-database-rest-api-Ur5-B2
// Persisted Asset ids are PostgreSQL UUIDs (36 characters). A batch of 100 keeps
// the encoded `in` filter below 4 KiB, reserving at least 12 KiB for the endpoint,
// selected fields, other filters, and headers.
const maxAssetIdsPerPostgrestMetadataRequest = 100;

// Metadata loading supports content reads, so cap its fan-out at half of the
// content engine's shared remote-read ceiling instead of defining an unrelated
// concurrency budget.
const maxConcurrentAssetMetadataPostgrestRequests = Math.ceil(
  assetResourceLimits.concurrentContentReads / 2
);

// Keep encoded `in` filters around 4 KiB. File storage names can be much
// longer than Asset ids, so a fixed item count cannot provide the same bound.
const maxPostgrestInFilterCharacters = 4 * 1024;

const chunkPostgrestInValues = (values: Iterable<string>) => {
  const chunks: string[][] = [];
  let chunk: string[] = [];
  for (const value of new Set(values)) {
    const candidate = [...chunk, value];
    const encodedFilter = new URLSearchParams({
      name: `in.(${candidate.join(",")})`,
    }).toString();
    if (
      chunk.length > 0 &&
      encodedFilter.length > maxPostgrestInFilterCharacters
    ) {
      chunks.push(chunk);
      chunk = [value];
      continue;
    }
    chunk = candidate;
  }
  if (chunk.length > 0) {
    chunks.push(chunk);
  }
  return chunks;
};

// File.uploaderProjectId records physical-file provenance, not every project
// allowed to reference it. clone_project intentionally shares File rows while
// copying their logical Asset rows, so filtering these lookups by that field
// would prevent cloned projects from restoring their shared files during Undo.
const loadUploadedFilesByNames = async ({
  names,
  client,
}: {
  names: Iterable<string>;
  client: Client;
}) => {
  const chunks = chunkPostgrestInValues(names);
  return (
    await mapBounded(
      chunks,
      maxConcurrentAssetMetadataPostgrestRequests,
      async (chunk) => {
        const files = await client
          .from("File")
          .select()
          .in("name", chunk)
          .eq("status", "UPLOADED");
        assertPostgrestSuccess(files);
        return (files.data ?? []).filter((file) => file.status === "UPLOADED");
      }
    )
  ).flat();
};

const restoreUploadedFilesByNames = async ({
  names,
  client,
}: {
  names: Iterable<string>;
  client: Client;
}) => {
  await mapBounded(
    chunkPostgrestInValues(names),
    maxConcurrentAssetMetadataPostgrestRequests,
    async (chunk) => {
      const restoredFiles = await client
        .from("File")
        .update({ isDeleted: false })
        .in("name", chunk)
        .eq("status", "UPLOADED");
      assertPostgrestSuccess(restoredFiles);
    }
  );
};

const restoreSharedAssetFileWithClient = async (
  {
    projectId,
    assetId,
    expectedName,
    replacementName,
  }: {
    projectId: string;
    assetId: string;
    expectedName: string;
    replacementName: string;
  },
  client: Client
) => {
  // clone_project shares existing File revision rows with the source project.
  // Restore the shared target before the compare-and-set so an Asset never
  // points at a deleted file if either request fails.
  const restoredFile = await client
    .from("File")
    .update({ isDeleted: false })
    .eq("name", replacementName)
    .eq("status", "UPLOADED")
    .select("name")
    .maybeSingle();
  assertPostgrestSuccess(restoredFile);
  if (restoredFile.data?.name !== replacementName) {
    throw new AssetRepositoryNotFoundError("Asset revision is not available");
  }

  const updatedAsset = await client
    .from("Asset")
    .update({ name: replacementName })
    .eq("id", assetId)
    .eq("projectId", projectId)
    .eq("name", expectedName)
    .select("id")
    .maybeSingle();
  assertPostgrestSuccess(updatedAsset);
  if (updatedAsset.data?.id !== assetId) {
    throw new AssetRevisionConflictError(
      "This file changed since it was opened. Reload it before saving again."
    );
  }
  // Retain the prior File revision here. A separate read-then-delete cleanup
  // could mark it deleted after another project or Undo restores a reference.
  // Owned revisions use swap_asset_file's transactional cleanup instead.
};

export const createAssetRows = (assets: Iterable<Asset>, projectId: string) =>
  Array.from(assets, (asset) => ({
    id: asset.id,
    projectId,
    name: asset.name,
    filename: asset.filename ?? null,
    description: asset.description ?? null,
    folderId: asset.folderId ?? null,
  }));

export type AssetUploadReservation = Pick<
  Asset,
  "id" | "name" | "filename" | "folderId" | "createdAt"
> & {
  status?: "UPLOADING" | "UPLOADED";
};

const uploadReservationFreshnessMs = 30 * 60 * 1000;

export const loadAssetUploadReservationsByProjectWithClient = async (
  projectId: string,
  client: Client,
  now = new Date()
): Promise<AssetUploadReservation[]> => {
  const response = await client
    .from("Asset")
    .select(
      "id, filename, folderId, file:File!inner(name, status, isDeleted, createdAt, updatedAt)"
    )
    .eq("projectId", projectId)
    .order("id");
  assertPostgrestSuccess(response);
  const activeAfter = now.getTime() - uploadReservationFreshnessMs;
  return (response.data ?? []).flatMap(({ id, filename, folderId, file }) => {
    if (
      file.status !== "UPLOADED" &&
      (file.status !== "UPLOADING" ||
        file.isDeleted ||
        new Date(file.updatedAt).getTime() <= activeAfter)
    ) {
      return [];
    }
    return [
      {
        id,
        name: file.name,
        filename: filename ?? undefined,
        folderId: folderId ?? undefined,
        createdAt: file.createdAt,
        status: file.status,
      },
    ];
  });
};

export const deleteAssetUploadReservationWithClient = async (
  {
    projectId,
    assetId,
    name,
  }: { projectId: string; assetId: string; name: string },
  client: Client
) => {
  const deletedAsset = await client
    .from("Asset")
    .delete()
    .eq("id", assetId)
    .eq("projectId", projectId)
    .eq("name", name)
    .select("id")
    .maybeSingle();
  assertPostgrestSuccess(deletedAsset);
  if (deletedAsset.data?.id !== assetId) {
    return;
  }
  const deletedFile = await client
    .from("File")
    .delete()
    .eq("name", name)
    .eq("uploaderProjectId", projectId)
    .eq("status", "UPLOADING");
  assertPostgrestSuccess(deletedFile);
};

export const loadAssetsByProjectWithClient = async (
  projectId: string,
  client: Client,
  assetIds?: string[]
): Promise<Asset[]> => {
  if (assetIds?.length === 0) {
    return [];
  }

  const load = async (requestedAssetIds: string[] | undefined) => {
    let query = client
      .from("Asset")
      // use inner to filter out assets without file
      // when file is not uploaded
      .select(
        `
          assetId:id,
          projectId,
          filename,
          description,
          folderId,
          file:File!inner (*)
        `
      )
      .eq("projectId", projectId)
      .eq("file.status", "UPLOADED");
    if (requestedAssetIds !== undefined) {
      query = query.in("id", requestedAssetIds);
    }
    const response = await query
      // always sort by primary key to get stable list
      // required to not break fixtures
      .order("id");
    assertPostgrestSuccess(response);

    const result: Asset[] = [];
    for (const {
      assetId,
      projectId,
      filename,
      description,
      folderId,
      file,
    } of response.data ?? []) {
      if (file) {
        result.push(
          formatAsset({
            assetId,
            projectId,
            filename,
            description,
            folderId,
            file,
          })
        );
      }
    }
    return result;
  };

  if (assetIds === undefined) {
    return await load(undefined);
  }

  const uniqueAssetIds = [...new Set(assetIds)].sort();
  const chunks: string[][] = [];
  for (
    let offset = 0;
    offset < uniqueAssetIds.length;
    offset += maxAssetIdsPerPostgrestMetadataRequest
  ) {
    chunks.push(
      uniqueAssetIds.slice(
        offset,
        offset + maxAssetIdsPerPostgrestMetadataRequest
      )
    );
  }

  return (
    await mapBounded(chunks, maxConcurrentAssetMetadataPostgrestRequests, load)
  ).flat();
};

export const deleteAssetsWithClient = async (
  props: {
    ids: Array<Asset["id"]>;
    projectId: string;
  },
  client: Client
): Promise<void> => {
  const assets = await client
    .from("Asset")
    .select(
      `
        id,
        projectId,
        name,
        file:File!inner (*)
      `
    )
    .in("id", props.ids)
    .eq("projectId", props.projectId);
  assertPostgrestSuccess(assets);

  if ((assets.data ?? []).length === 0) {
    throw new AssetRepositoryNotFoundError("Assets not found");
  }

  const previewUpdate = await client
    .from("Project")
    .update({ previewImageAssetId: null })
    .eq("id", props.projectId)
    .in("previewImageAssetId", props.ids);
  assertPostgrestSuccess(previewUpdate);

  const deletedAssets = await client
    .from("Asset")
    .delete()
    .in("id", props.ids)
    .eq("projectId", props.projectId);
  assertPostgrestSuccess(deletedAssets);

  const unusedFileNames = new Set(assets.data?.map((asset) => asset.name));
  const assetsByStillUsedFileName = await client
    .from("Asset")
    .select("name")
    .in("name", Array.from(unusedFileNames));
  assertPostgrestSuccess(assetsByStillUsedFileName);
  for (const asset of assetsByStillUsedFileName.data ?? []) {
    unusedFileNames.delete(asset.name);
  }

  if (unusedFileNames.size > 0) {
    const deletedFiles = await client
      .from("File")
      .update({ isDeleted: true })
      .in("name", Array.from(unusedFileNames));
    assertPostgrestSuccess(deletedFiles);
  }
};

export const updateAssetMetadataWithClient = async (
  {
    projectId,
    assetId,
    values,
  }: {
    projectId: string;
    assetId: Asset["id"];
    values: AssetMetadataUpdate;
  },
  client: Client
): Promise<Asset> => {
  await persistAssetMetadataWithClient({ projectId, assetId, values }, client);

  const [asset] = await loadAssetsByProjectWithClient(projectId, client, [
    assetId,
  ]);
  if (asset === undefined) {
    throw new AssetRepositoryNotFoundError("Asset not found");
  }
  return asset;
};

export const updateAssetFilenameIfCurrentWithClient = async (
  {
    projectId,
    assetId,
    expectedFilename,
    filename,
  }: {
    projectId: string;
    assetId: Asset["id"];
    expectedFilename: string | undefined;
    filename: string | undefined;
  },
  client: Client
): Promise<Asset | undefined> => {
  const query = client
    .from("Asset")
    .update({ filename: filename ?? null })
    .eq("id", assetId)
    .eq("projectId", projectId);
  const result = await (
    expectedFilename === undefined
      ? query.is("filename", null)
      : query.eq("filename", expectedFilename)
  )
    .select("id")
    .maybeSingle();
  assertPostgrestSuccess(result);
  if (result.data?.id !== assetId) {
    return;
  }
  const [asset] = await loadAssetsByProjectWithClient(projectId, client, [
    assetId,
  ]);
  if (asset === undefined) {
    throw new AssetRepositoryNotFoundError("Asset not found");
  }
  return asset;
};

const persistAssetMetadataWithClient = async (
  {
    projectId,
    assetId,
    values,
  }: {
    projectId: string;
    assetId: Asset["id"];
    values: AssetMetadataUpdate;
  },
  client: Client
) => {
  const update: {
    filename?: string | null;
    description?: string | null;
    folderId?: string | null;
  } = {};
  if (Object.hasOwn(values, "filename")) {
    update.filename = values.filename ?? null;
  }
  if (Object.hasOwn(values, "description")) {
    update.description = values.description ?? null;
  }
  if (Object.hasOwn(values, "folderId")) {
    update.folderId = values.folderId ?? null;
  }
  const result = await client
    .from("Asset")
    .update(update)
    .eq("id", assetId)
    .eq("projectId", projectId)
    .select("id")
    .maybeSingle();
  assertPostgrestSuccess(result);
  if (result.data?.id !== assetId) {
    throw new AssetRepositoryNotFoundError("Asset not found");
  }
};

/**
 * Persists asset additions, deletions, metadata updates, and file revisions.
 */
export const patchAssetsWithClient = async (
  {
    projectId,
    client,
  }: {
    projectId: string;
    client: Client;
  },
  patches: Array<Patch>,
  {
    validate,
    allowSharedFileRestore = false,
  }: {
    validate?: (input: {
      current: ReadonlyMap<Asset["id"], Asset>;
      next: ReadonlyMap<Asset["id"], Asset>;
    }) => Promise<void>;
    /**
     * Allows the authorized sync endpoint to restore File rows shared by a
     * cloned project. Direct revision writes remain restricted to owned rows.
     */
    allowSharedFileRestore?: boolean;
  } = {}
): Promise<void> => {
  const assetsList = await loadAssetsByProjectWithClient(projectId, client);
  const assetsMap = new Map<Asset["id"], Asset>();
  for (const asset of assetsList) {
    assetsMap.set(asset.id, asset);
  }
  const patchedAssets = applyValidatedMapPatches(assetsMap, patches, (value) =>
    assets.parse(value)
  );
  for (const [assetId, asset] of patchedAssets) {
    if (asset.id !== assetId) {
      throw new Error(
        `Asset ${asset.id} does not match its map key ${assetId}`
      );
    }
    if (asset.projectId !== projectId) {
      throw new Error(`Asset ${asset.id} belongs to another project`);
    }
  }
  let replacementFilesByName = new Map<string, FileRow>();
  if (validate !== undefined || allowSharedFileRestore) {
    const canonical = await getCanonicalAssetsForValidation({
      current: assetsMap,
      next: patchedAssets,
      client,
    });
    replacementFilesByName = canonical.filesByName;
    await validate?.({ current: assetsMap, next: canonical.assets });
  }
  const {
    added,
    updated,
    deletedKeys: deletedAssetIds,
  } = diffMaps(
    assetsMap,
    patchedAssets,
    (previous, asset) =>
      previous.name === asset.name &&
      previous.filename === asset.filename &&
      previous.description === asset.description &&
      previous.folderId === asset.folderId &&
      serializeAssetMeta(previous.meta) === serializeAssetMeta(asset.meta)
  );
  const sharedMetadataAssetIds = new Set<Asset["id"]>();
  if (allowSharedFileRestore) {
    const assetsWithMetadataChanges = updated.filter((asset) => {
      const previous = assetsMap.get(asset.id);
      return (
        previous !== undefined &&
        serializeAssetMeta(previous.meta) !== serializeAssetMeta(asset.meta)
      );
    });
    const missingFileNames = assetsWithMetadataChanges.flatMap((asset) =>
      replacementFilesByName.has(asset.name) ? [] : [asset.name]
    );
    for (const file of await loadUploadedFilesByNames({
      names: missingFileNames,
      client,
    })) {
      replacementFilesByName.set(file.name, file);
    }
    for (const asset of assetsWithMetadataChanges) {
      const file = replacementFilesByName.get(asset.name);
      if (file === undefined) {
        throw new AssetRepositoryNotFoundError(
          `Asset file not found for ${asset.id}`
        );
      }
      // Files uploaded before provenance tracking have a null project id.
      // Preserve their existing metadata edits, but validate replacement files.
      if (
        file.uploaderProjectId === projectId ||
        (file.uploaderProjectId === null &&
          assetsMap.get(asset.id)?.name === asset.name)
      ) {
        continue;
      }
      sharedMetadataAssetIds.add(asset.id);
      const authoritativeMeta = formatAsset({
        assetId: asset.id,
        projectId,
        filename: asset.filename ?? null,
        description: asset.description ?? null,
        folderId: asset.folderId,
        file,
      }).meta;
      if (
        serializeAssetMeta(asset.meta) !== serializeAssetMeta(authoritativeMeta)
      ) {
        throw new Error("Shared asset metadata does not match its file");
      }
    }
  }
  if (deletedAssetIds.length !== 0) {
    await deleteAssetsWithClient({ projectId, ids: deletedAssetIds }, client);
  }

  for (const asset of updated) {
    const previous = assetsMap.get(asset.id);
    if (previous === undefined) {
      throw new Error(`Asset ${asset.id} was not loaded`);
    }
    if (previous.name !== asset.name) {
      const replacementFile = replacementFilesByName.get(asset.name);
      if (allowSharedFileRestore && replacementFile === undefined) {
        throw new AssetRepositoryNotFoundError(
          `Asset file not found for ${asset.id}`
        );
      }
      if (
        allowSharedFileRestore &&
        replacementFile !== undefined &&
        replacementFile.uploaderProjectId !== projectId
      ) {
        await restoreSharedAssetFileWithClient(
          {
            projectId,
            assetId: asset.id,
            expectedName: previous.name,
            replacementName: asset.name,
          },
          client
        );
      } else {
        await swapAssetFileWithClient(
          {
            projectId,
            assetId: asset.id,
            expectedName: previous.name,
            replacementName: asset.name,
          },
          client
        );
      }
    }
    if (
      previous.filename !== asset.filename ||
      previous.description !== asset.description ||
      previous.folderId !== asset.folderId
    ) {
      const { filename, description, folderId } = asset;
      await persistAssetMetadataWithClient(
        {
          projectId,
          assetId: asset.id,
          values: { filename, description, folderId },
        },
        client
      );
    }
    if (
      sharedMetadataAssetIds.has(asset.id) === false &&
      serializeAssetMeta(previous.meta) !== serializeAssetMeta(asset.meta)
    ) {
      const meta = serializeAssetMeta(asset.meta);
      const updatedFile = await client
        .from("File")
        .update({ meta })
        .eq("name", asset.name)
        .select("meta")
        .single();
      assertPostgrestSuccess(updatedFile);
      if (updatedFile.data?.meta !== meta) {
        throw new Error(
          `Asset metadata update was not persisted for ${asset.id}`
        );
      }
    }
  }
  const addedAssets: Asset[] = added;
  if (addedAssets.length !== 0) {
    const files = await loadUploadedFilesByNames({
      names: addedAssets.map((asset) => asset.name),
      client,
    });
    const fileNames = new Set(files.map((file) => file.name));
    const missingFile = addedAssets.find(
      (asset) => fileNames.has(asset.name) === false
    );
    if (missingFile !== undefined) {
      throw new AssetRepositoryNotFoundError(
        `Asset file not found for ${missingFile.id}`
      );
    }

    // restore file when undo is triggered
    await restoreUploadedFilesByNames({ names: fileNames, client });

    const insertedAssets = await client
      .from("Asset")
      .insert(createAssetRows(addedAssets, projectId));
    assertPostgrestSuccess(insertedAssets);
  }
};
