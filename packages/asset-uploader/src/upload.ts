import {
  type AppContext,
  authorizeProject,
  AuthorizationError,
  getProjectPlanFeatures,
} from "@webstudio-is/trpc-interface/index.server";
import { nanoid } from "nanoid";
import { getFileNameParts, type Asset } from "@webstudio-is/sdk";
import type { Database } from "@webstudio-is/postgrest/index.server";
import type { AssetClient } from "./client";
import type { AssetDataOverride } from "./utils/get-asset-data";
import { createUniqueAssetFilename } from "./utils/get-unique-filename";
import { sanitizeS3Key } from "./utils/sanitize-s3-key";
import { formatAsset } from "./utils/format-asset";
import { assertPostgrestSuccess } from "./patch-utils";

type UploadData = {
  projectId: string;
  type: string;
  filename: string;
  displayFilename?: string;
  description?: string;
  folderId?: string;
  contentHash?: string;
};

export type UploadTicket = {
  assetId: Asset["id"];
  name: string;
  deduplicated: boolean;
};

const UPLOADING_STALE_TIMEOUT = 1000 * 60 * 30; // 30 minutes
const maxCreateUploadTicketAttempts = 3;
const contentHashUploadPollInterval = 100;
const contentHashUploadPollAttempts = 50;

const findContentHashUploadTicket = async ({
  projectId,
  contentHash,
  context,
}: {
  projectId: string;
  contentHash: string;
  context: AppContext;
}): Promise<UploadTicket | undefined> => {
  for (let attempt = 0; attempt < contentHashUploadPollAttempts; attempt += 1) {
    const file = await context.postgrest.client
      .from("File")
      .select("name, status, createdAt")
      .eq("uploaderProjectId", projectId)
      .eq("contentHash", contentHash)
      .maybeSingle();
    if (file.error) {
      throw new Error(file.error.message);
    }
    if (file.data === null) {
      return;
    }
    if (file.data.status === "UPLOADED") {
      const asset = await context.postgrest.client
        .from("Asset")
        .select("id")
        .eq("projectId", projectId)
        .eq("name", file.data.name)
        .maybeSingle();
      if (asset.error) {
        throw new Error(asset.error.message);
      }
      if (asset.data === null) {
        throw new Error("Deduplicated asset record is missing.");
      }
      return {
        assetId: asset.data.id,
        name: file.data.name,
        deduplicated: true,
      };
    }
    if (
      new Date(file.data.createdAt).getTime() <
      Date.now() - UPLOADING_STALE_TIMEOUT
    ) {
      const deletedAsset = await context.postgrest.client
        .from("Asset")
        .delete()
        .eq("projectId", projectId)
        .eq("name", file.data.name);
      assertPostgrestSuccess(deletedAsset);
      const deletedFile = await context.postgrest.client
        .from("File")
        .delete()
        .eq("name", file.data.name);
      assertPostgrestSuccess(deletedFile);
      return;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, contentHashUploadPollInterval)
    );
  }
  throw new Error(
    "An identical asset upload is still in progress. Retry after it completes."
  );
};

export type UploadErrorCleanup = (
  name: string,
  context: AppContext
) => Promise<void>;

const cleanupUploadError = async (
  name: string,
  context: AppContext,
  onUploadError?: UploadErrorCleanup
) => {
  if (onUploadError) {
    await onUploadError(name, context);
    return;
  }
  await context.postgrest.client.from("Asset").delete().eq("name", name);
  await context.postgrest.client.from("File").delete().eq("name", name);
};

export const createUploadTicket = async (
  data: UploadData,
  context: AppContext,
  createId: () => Asset["id"] = nanoid
): Promise<UploadTicket> => {
  const {
    projectId,
    type,
    filename,
    displayFilename = getFileNameParts(filename).basename,
    description,
    folderId,
    contentHash,
  } = data;
  const sanitizedFilename = sanitizeS3Key(filename);
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );
  if (canEdit === false) {
    throw new AuthorizationError(
      "You don't have access to create this project assets"
    );
  }

  if (contentHash !== undefined) {
    const existing = await findContentHashUploadTicket({
      projectId,
      contentHash,
      context,
    });
    if (existing !== undefined) {
      return existing;
    }
  }

  const { maxAssetsPerProject } = await getProjectPlanFeatures(
    projectId,
    context
  );

  /**
   * sometimes for example on request timeout we don't know what happened to the "UPLOADING" asset,
   * so we don't take into account assets with the "UPLOADING" status that were created more
   * than UPLOADING_STALE_TIMEOUT milliseconds ago
   **/

  const assetCount = await context.postgrest.client
    .from("Asset")
    .select("id, file:File!inner(status)", { count: "exact", head: true })
    .eq("projectId", projectId)
    .eq("file.status", "UPLOADED");

  const uploadingCount = await context.postgrest.client
    .from("File")
    .select("*", { count: "exact", head: true })
    .eq("isDeleted", false)
    .eq("uploaderProjectId", projectId)
    .eq("status", "UPLOADING")
    .gt(
      "createdAt",
      new Date(Date.now() - UPLOADING_STALE_TIMEOUT).toISOString()
    );

  const count = (assetCount.count ?? 0) + (uploadingCount.count ?? 0);

  if (count >= maxAssetsPerProject) {
    /**
     * Here is right to write `Max ${maxAssetsPerProject}` but see the comment below,
     * it's probable that the user can exceed the limit a little bit.
     * So it can be a little bit strange that the limit is 5 but the user already has 7.
     **/
    throw new Error(
      `The maximum number of assets per project is ${maxAssetsPerProject}.`
    );
  }

  /**
   * Create a temporary "UPLOADING" asset, so it can be counted in the next query
   * Assumptions:
   * - it's possible to create more assets than maxAssetsPerProject,
   *   but for now we assume that the time since the `count` query above and the `create` query below is negligible,
   *   and some kind of rate limiting exists on API.
   * Also no locking exists in Prisma, and no raw query locking like
   * "SELECT id FROM "Project" where id=? FOR UPDATE;" is shareable between sqlite and postgres.
   **/
  for (
    let attempt = 1;
    attempt <= maxCreateUploadTicketAttempts;
    attempt += 1
  ) {
    const assetId = createId();
    const name = createUniqueAssetFilename(sanitizedFilename);

    const fileInsert = await context.postgrest.client.from("File").insert({
      name,
      status: "UPLOADING",
      // store content type in related field
      format: type,
      size: 0,
      uploaderProjectId: projectId,
      contentHash,
    });
    if (fileInsert.error) {
      if (fileInsert.error.code === "23505" && contentHash !== undefined) {
        const existing = await findContentHashUploadTicket({
          projectId,
          contentHash,
          context,
        });
        if (existing !== undefined) {
          return existing;
        }
      }
      throw new Error(fileInsert.error.message);
    }

    const assetInsert = await context.postgrest.client.from("Asset").insert({
      id: assetId,
      projectId,
      name,
      filename: displayFilename,
      description,
      folderId,
    });
    if (assetInsert.error) {
      await context.postgrest.client.from("File").delete().eq("name", name);
      if (
        assetInsert.error.code === "23505" &&
        attempt < maxCreateUploadTicketAttempts
      ) {
        continue;
      }
      throw new Error(assetInsert.error.message);
    }

    return { assetId, name, deduplicated: false };
  }

  throw new Error("Unable to reserve asset upload.");
};

export const uploadFileData = async (
  name: string,
  data: ReadableStream<Uint8Array>,
  client: AssetClient,
  context: AppContext,
  assetInfoFallback:
    | { width: number; height: number; format: string }
    | undefined,
  assetDataOverride?: AssetDataOverride,
  onUploadError?: UploadErrorCleanup
): Promise<Database["public"]["Tables"]["File"]["Row"]> => {
  let file = await context.postgrest.client
    .from("File")
    .select("*")
    .eq("name", name)
    .eq("status", "UPLOADING")
    .gt(
      "createdAt",
      new Date(Date.now() - UPLOADING_STALE_TIMEOUT).toISOString()
    )
    .single();
  if (file.data === null) {
    throw Error("File already uploaded or url is expired");
  }

  try {
    const assetData = await client.uploadFile(
      name,
      file.data.format,
      // global web streams types do not define ReadableStream as async iterable
      data as unknown as AsyncIterable<Uint8Array>,
      assetInfoFallback,
      assetDataOverride
    );
    const { meta, format, size } = assetData;
    file = await context.postgrest.client
      .from("File")
      .update({
        size,
        format,
        meta: JSON.stringify(meta),
        status: "UPLOADED",
      })
      .eq("name", name)
      .select()
      .single();
    if (file.data === null) {
      throw Error("File not found");
    }
    return file.data;
  } catch (error) {
    await cleanupUploadError(name, context, onUploadError);
    throw error;
  }
};

export const getUploadedAsset = async ({
  name,
  projectId,
  context,
  file: providedFile,
}: {
  name: string;
  projectId: string;
  context: AppContext;
  file?: Database["public"]["Tables"]["File"]["Row"];
}): Promise<Asset> => {
  let file = providedFile;
  if (file === undefined) {
    const result = await context.postgrest.client
      .from("File")
      .select("*")
      .eq("name", name)
      .eq("status", "UPLOADED")
      .single();
    if (result.error || result.data === null) {
      throw new Error(result.error?.message ?? "File not found");
    }
    file = result.data;
  }
  const asset = await context.postgrest.client
    .from("Asset")
    .select("id, projectId, filename, description, folderId")
    .eq("name", name)
    .eq("projectId", projectId)
    .single();
  if (asset.error || asset.data === null) {
    throw new Error(asset.error?.message ?? "Asset not found");
  }
  return formatAsset({
    assetId: asset.data.id,
    projectId: asset.data.projectId,
    filename: asset.data.filename,
    description: asset.data.description,
    folderId: asset.data.folderId,
    file,
  });
};

export const uploadFile = async (
  name: string,
  data: ReadableStream<Uint8Array>,
  client: AssetClient,
  context: AppContext,
  assetInfoFallback:
    | { width: number; height: number; format: string }
    | undefined,
  assetDataOverride?: AssetDataOverride,
  onUploadError?: UploadErrorCleanup
): Promise<Asset> => {
  const file = await uploadFileData(
    name,
    data,
    client,
    context,
    assetInfoFallback,
    assetDataOverride,
    onUploadError
  );
  try {
    const projectId = file.uploaderProjectId;
    if (typeof projectId !== "string") {
      throw Error("File uploader project is missing");
    }
    return await getUploadedAsset({
      name,
      projectId,
      context,
      file,
    });
  } catch (error) {
    await cleanupUploadError(name, context, onUploadError);
    throw error;
  }
};
