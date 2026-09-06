import { type Asset, assets } from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import type { Client } from "@webstudio-is/postgrest/index.server";
import { mapBounded } from "@webstudio-is/content-engine/compiler";
import { formatAsset } from "./utils/format-asset";
import {
  applyValidatedMapPatches,
  assertPostgrestSuccess,
  diffMaps,
  type Patch,
} from "./patch-utils";
import { swapAssetFileWithClient } from "./revision";
import type { AssetMetadataUpdate } from "./asset-mutation-types";
import { AssetRepositoryNotFoundError } from "./asset-repository-errors";

const serializeAssetMeta = (meta: Asset["meta"]) => JSON.stringify(meta);

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
  }: {
    validate?: (input: {
      current: ReadonlyMap<Asset["id"], Asset>;
      next: ReadonlyMap<Asset["id"], Asset>;
    }) => Promise<void>;
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
  for (const asset of patchedAssets.values()) {
    if (asset.projectId !== projectId) {
      throw new Error(`Asset ${asset.id} belongs to another project`);
    }
  }
  await validate?.({ current: assetsMap, next: patchedAssets });
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
  if (deletedAssetIds.length !== 0) {
    await deleteAssetsWithClient({ projectId, ids: deletedAssetIds }, client);
  }

  for (const asset of updated) {
    const previous = assetsMap.get(asset.id);
    if (previous === undefined) {
      throw new Error(`Asset ${asset.id} was not loaded`);
    }
    if (previous.name !== asset.name) {
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
    if (serializeAssetMeta(previous.meta) !== serializeAssetMeta(asset.meta)) {
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
    const files = await client
      .from("File")
      .select()
      .in(
        "name",
        addedAssets.map((asset) => asset.name)
      );
    assertPostgrestSuccess(files);

    const fileNames = new Set(files.data?.map((file) => file.name));
    const missingFile = addedAssets.find(
      (asset) => fileNames.has(asset.name) === false
    );
    if (missingFile !== undefined) {
      throw new AssetRepositoryNotFoundError(
        `Asset file not found for ${missingFile.id}`
      );
    }

    // restore file when undo is triggered
    const restoredFiles = await client
      .from("File")
      .update({ isDeleted: false })
      .in("name", Array.from(fileNames));
    assertPostgrestSuccess(restoredFiles);

    const insertedAssets = await client
      .from("Asset")
      .insert(createAssetRows(addedAssets, projectId));
    assertPostgrestSuccess(insertedAssets);
  }
};
